import argparse
import json
import os
import pdfplumber
import re
from typing import Any, Dict, List, Optional, Tuple

DSM5_FAMILY_TITLES: List[str] = [
    "Neurodevelopmental Disorders",
    "Schizophrenia Spectrum and Other Psychotic Disorders",
    "Bipolar and Related Disorders",
    "Depressive Disorders",
    "Anxiety Disorders",
    "Obsessive-Compulsive and Related Disorders",
    "Trauma- and Stressor-Related Disorders",
    "Dissociative Disorders",
    "Somatic Symptom and Related Disorders",
    "Feeding and Eating Disorders",
    "Elimination Disorders",
    "Sleep-Wake Disorders",
    "Sexual Dysfunctions",
    "Gender Dysphoria",
    "Disruptive, Impulse-Control, and Conduct Disorders",
    "Substance-Related and Addictive Disorders",
    "Neurocognitive Disorders",
    "Personality Disorders",
    "Paraphilic Disorders",
    "Other Mental Disorders",
    "Medication-Induced Movement Disorders and Other Adverse Effects of Medication",
    "Other Conditions That May Be a Focus of Clinical Attention",
]

#---------------------------------------------------------
# Basic
#---------------------------------------------------------
def extract_all_text(path: str) -> str:
    """Concatenate text from all pages into a single string."""
    chunks: List[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def extract_page_range(path: str, start_page: int, end_page: int) -> str:
    """Extract a subset of pages (1-based inclusive)."""
    chunks: List[str] = []
    with pdfplumber.open(path) as pdf:
        for i in range(start_page - 1, end_page):
            chunks.append(pdf.pages[i].extract_text() or "")
    return "\n".join(chunks)


#---------------------------------------------------------
# Classification Parsing
#---------------------------------------------------------

def get_classification_text(path: str) -> str:
    # adjust page numbers to match your copy
    return extract_page_range(path, start_page=10, end_page=49)


def extract_disorder_classes(classification_text: str) -> List[Tuple[str, int]]:
    """
    Return list of (class_name, page) from the DSM-5 Classification block.
    Matches lines like:
      Neurodevelopmental Disorders (17)
      Bipolar and Related Disorders (65)
    """
    normalized = re.sub(r"-\s*\n", "-", classification_text)
    normalized = re.sub(r"\s+", " ", normalized)
    classes: List[Tuple[str, int]] = []
    for title in DSM5_FAMILY_TITLES:
        pattern = rf"{re.escape(title)}\s*\((\d+)\)"
        match = re.search(pattern, normalized)
        if match:
            classes.append((title, int(match.group(1))))
    return classes


def extract_diagnostic_groups(
    classification_text: str,
) -> Dict[str, List[Tuple[str, int]]]:
    """
    Map each DSM-5 family to a list of (diagnostic_group, page) tuples.
    """
    lines = classification_text.splitlines()
    groups: Dict[str, List[Tuple[str, int]]] = {}
    current_family: Optional[str] = None
    roman_re = re.compile(r"^[ivxlcdm]+$", re.IGNORECASE)
    heading_re = re.compile(r"\((\d{1,3})\)\s*$")
    heading_token_re = re.compile(r"^[A-Za-z][A-Za-z &'’/,–—\-()]+$")

    def should_skip(line: str) -> bool:
        stripped = line.strip()
        if not stripped:
            return True
        if roman_re.match(stripped):
            return True
        if "DSM-5 Classification" in stripped:
            return True
        return False

    def compose_heading(start_idx: int) -> Tuple[Optional[str], Optional[int], int]:
        parts: List[str] = []
        idx = start_idx
        while idx < len(lines) and len(parts) < 4:
            segment = lines[idx].strip()
            if not segment or should_skip(segment):
                break
            prefix = segment.split("(", 1)[0].strip()
            if prefix and ")" in prefix and "(" not in prefix:
                break
            if prefix and not heading_token_re.match(prefix):
                break
            parts.append(segment)
            candidate = re.sub(r"\s+", " ", " ".join(parts)).strip()
            match = heading_re.search(candidate)
            if match:
                title = candidate[: match.start()].strip()
                if not title:
                    return None, None, idx + 1
                return title, int(match.group(1)), idx + 1
            idx += 1
        return None, None, start_idx + 1

    i = 0
    while i < len(lines):
        raw_line = lines[i]
        if should_skip(raw_line):
            i += 1
            continue

        stripped = raw_line.strip()
        if not stripped or not stripped[0].isupper():
            i += 1
            continue

        prefix = stripped.split("(", 1)[0].strip()
        if prefix and ")" in prefix and "(" not in prefix:
            i += 1
            continue
        if prefix and not heading_token_re.match(prefix):
            i += 1
            continue

        title, page, next_idx = compose_heading(i)
        if not title or page is None:
            i = next_idx
            continue

        title = re.sub(r"\s+", " ", title)

        words = re.findall(r"[A-Za-z]+", title)

        if title in DSM5_FAMILY_TITLES:
            current_family = title
        elif (
            current_family
            and not any(ch.isdigit() for ch in title)
            and (len(words) >= 2 or title in {"Parasomnias"})
        ):
            groups.setdefault(current_family, []).append((title, page))

        i = next_idx

    return groups


def extract_disorder_names(classification_text: str) -> List[Tuple[str, str]]:
    """
    Return list of (code, name) from the DSM-5 Classification block.
    Heuristic regex: lines look like '296.21 (F32.0) Major Depressive Disorder (94)'
    """
    pattern = r"(?m)^\s*(\d{3}\.\d+|\d{3})\s+\(F[0-9.]+\)\s+(.+?)\s*(?:\(|$)"
    matches = re.findall(pattern, classification_text)
    # e.g. [("296.21", "Major Depressive Disorder"), ...]
    return matches


CODE_PATTERN = r"(?:\d{3}(?:\.\d+)?|___.__)"
CRITERIA_DEMO_CONFIG = {
    "INTELLECTUAL_DISABILITY_INTELLECTUAL_DEVELOPMENTAL_DISORDER": {
        "pages": (66, 72),
        "start_marker": "The following three criteria must be met:",
        "end_markers": ["Note:", "Specify current severity"],
        "type": "symptom_cluster",
    }
}


def parse_specifier_blocks(trail_text: str) -> List[Dict[str, Any]]:
    if not trail_text:
        return []
    lines = [line.strip() for line in trail_text.strip().splitlines()]
    specifiers: List[Dict[str, Any]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line:
            i += 1
            continue
        lowered = line.lower()
        if lowered.startswith("specify"):
            heading = line
            after_colon = ""
            if ":" in line:
                heading, after_colon = line.split(":", 1)
                after_colon = after_colon.strip()
            heading_lower = heading.lower()
            if "current severity" in heading_lower:
                label = "Current Severity"
            elif heading_lower.startswith("specify whether"):
                label = "Specifiers"
            elif heading_lower.startswith("specify if"):
                label = "Specifiers"
            else:
                label = heading.replace("Specify", "").strip(": ")
                label = label or "Specifiers"
            option_lines: List[str] = []
            if after_colon:
                option_lines.append(after_colon)
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if not nxt:
                    i += 1
                    break
                nxt_lower = nxt.lower()
                if nxt_lower.startswith(("specify", "note")):
                    break
                if re.search(r"\(\d{1,3}\)\s*$", nxt):
                    break
                option_lines.append(nxt)
                i += 1
            values: List[Dict[str, Optional[str]]] = []
            parsed_code_line = False
            for opt_line in option_lines:
                code_match = re.match(
                    rf"({CODE_PATTERN})\s+\(([^)]+)\)\s+(.+)", opt_line
                )
                if code_match:
                    parsed_code_line = True
                    values.append(
                        {
                            "label": code_match.group(3).strip(),
                            "icd9_code": code_match.group(1).strip(),
                            "icd10_code": code_match.group(2).strip(),
                        }
                    )
                else:
                    parts = re.split(r",\s*|\;\s*", opt_line)
                    for part in parts:
                        cleaned = part.strip()
                        if cleaned:
                            values.append(
                                {
                                    "label": cleaned,
                                    "icd9_code": None,
                                    "icd10_code": None,
                                }
                            )
            if values:
                specifiers.append(
                    {
                        "label": label,
                        "type": "enum",
                        "values": values,
                    }
                )
            continue
        i += 1
    return specifiers


def extract_disorder_entries(classification_text: str) -> List[Dict[str, Any]]:
    """
    Return list of dicts with icd9, icd10, name, page, and specifier text extracted from the classification block.
    """
    normalized = re.sub(r"-\s*\n\s*", "", classification_text)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    pattern = re.compile(
        rf"({CODE_PATTERN})\s+\(([^)]+)\)\s+"
        rf"((?:(?!\n\s*{CODE_PATTERN}\s+\().)+?)\s*\((\d{{1,3}})\)",
        re.DOTALL,
    )
    entries: List[Dict[str, Any]] = []
    matches = list(pattern.finditer(normalized))
    for idx, match in enumerate(matches):
        icd9, icd10, name, page = match.group(1), match.group(2), match.group(3), match.group(4)
        cleaned_name = name.strip()
        if "DSM-5 Classification" in cleaned_name:
            continue
        if cleaned_name.lower().startswith(("specify", "note")):
            continue
        next_start = matches[idx + 1].start() if idx + 1 < len(matches) else len(normalized)
        trail_text = normalized[match.end():next_start].strip()
        entries.append(
            {
                "icd9": icd9.strip(),
                "icd10": icd10.strip(),
                "name": cleaned_name,
                "page": int(page),
                "specifiers": parse_specifier_blocks(trail_text),
            }
        )
    return entries


def build_family_hierarchy(classification_text: str) -> List[Dict[str, Any]]:
    families = extract_disorder_classes(classification_text)
    groups_by_family = extract_diagnostic_groups(classification_text)
    disorder_entries = extract_disorder_entries(classification_text)

    if not families:
        return []

    page_candidates: List[int] = [page for _, page in families]
    for fan in groups_by_family.values():
        page_candidates.extend(page for _, page in fan)
    page_candidates.extend(entry["page"] for entry in disorder_entries)
    classification_end = max(page_candidates) if page_candidates else 0

    family_objects: List[Dict[str, Any]] = []
    for fam_name, fam_page in families:
        group_entries = [
            {"name": grp_name, "page": grp_page, "disorders": []}
            for grp_name, grp_page in sorted(
                groups_by_family.get(fam_name, []), key=lambda item: item[1]
            )
        ]
        family_objects.append(
            {
                "family": fam_name,
                "page": fam_page,
                "groups": group_entries,
                "disorders": [],
            }
        )

    def compute_ranges(items: List[Dict[str, Any]], default_end: int) -> None:
        for idx, item in enumerate(items):
            start = item["page"]
            end = (
                items[idx + 1]["page"]
                if idx + 1 < len(items)
                else default_end
            )
            item["_range"] = (start, end)
            item["page_end"] = end - 1

    for idx, fam in enumerate(family_objects):
        family_end = (
            family_objects[idx + 1]["page"]
            if idx + 1 < len(family_objects)
            else classification_end + 1
        )
        fam["_range"] = (fam["page"], family_end)
        fam["page_end"] = family_end - 1
        compute_ranges(fam["groups"], family_end)

    for entry in disorder_entries:
        assigned_family: Optional[Dict[str, Any]] = None
        for fam in family_objects:
            start, end = fam["_range"]
            if start <= entry["page"] < end:
                assigned_family = fam
                break
        if not assigned_family:
            continue

        target_group: Optional[Dict[str, Any]] = None
        for grp in assigned_family["groups"]:
            g_start, g_end = grp["_range"]
            if g_start <= entry["page"] < g_end:
                target_group = grp
                break

        record = {
            "icd9": entry["icd9"],
            "icd10": entry["icd10"],
            "name": entry["name"],
            "page": entry["page"],
            "specifiers": entry.get("specifiers", []),
        }

        if target_group:
            target_group["disorders"].append(record)
        else:
            assigned_family["disorders"].append(record)

    for fam in family_objects:
        fam.pop("_range", None)
        for grp in fam["groups"]:
            grp.pop("_range", None)

    return family_objects


def slugify_id(text: str) -> str:
    tokens = re.findall(r"[A-Za-z0-9]+", text.upper())
    return "_".join(tokens) if tokens else "ITEM"


def make_unique_id(base: str, existing: set) -> str:
    candidate = base or "ITEM"
    if candidate not in existing:
        existing.add(candidate)
        return candidate
    suffix = 2
    while f"{candidate}_{suffix}" in existing:
        suffix += 1
    final_id = f"{candidate}_{suffix}"
    existing.add(final_id)
    return final_id


def export_structured_dataset(
    hierarchy: List[Dict[str, Any]],
    output_dir: str,
    disorder_descriptions: Optional[Dict[str, str]] = None,
    specifier_details: Optional[Dict[str, Dict[str, str]]] = None,
) -> None:
    os.makedirs(output_dir, exist_ok=True)

    family_ids: Dict[str, str] = {}
    group_records: Dict[str, Dict[str, Any]] = {}
    family_payload: List[Dict[str, Any]] = []
    family_records: Dict[str, Dict[str, Any]] = {}
    group_payload: List[Dict[str, Any]] = []
    disorder_payload: List[Dict[str, Any]] = []
    used_family_ids: set = set()
    used_group_ids: set = set()
    used_disorder_ids: set = set()
    used_specifier_ids: set = set()
    specifier_payload: List[Dict[str, Any]] = []

    for family in hierarchy:
        fam_id = make_unique_id(slugify_id(family["family"]), used_family_ids)
        family_ids[family["family"]] = fam_id
        group_ids: List[str] = []
        for group in family["groups"]:
            grp_id = make_unique_id(slugify_id(group["name"]), used_group_ids)
            group_record = {
                "id": grp_id,
                "family_id": fam_id,
                "name": group["name"],
                "page_start": group["page"],
                "page_end": group.get("page_end"),
                "disorder_ids": [],
            }
            group["_structured_id"] = grp_id
            group_records[grp_id] = group_record
            group_payload.append(group_record)
            group_ids.append(grp_id)

        family_record = {
            "id": fam_id,
            "name": family["family"],
            "page_start": family["page"],
            "page_end": family.get("page_end"),
            "description": "",
            "group_ids": group_ids,
            "disorder_ids": [],
        }
        family_payload.append(family_record)
        family_records[fam_id] = family_record

    for family in hierarchy:
        fam_id = family_ids[family["family"]]

        def register_disorder(
            disorder: Dict[str, Any], group_id: Optional[str]
        ) -> None:
            base = slugify_id(disorder["name"])
            if disorder["icd9"] and disorder["icd9"] != "___.__":
                code_token = disorder["icd9"].replace(".", "_")
                base = f"{base}_{code_token}"
            disorder_id = make_unique_id(base, used_disorder_ids)
            record = {
                "id": disorder_id,
                "family_id": fam_id,
                "group_id": group_id,
                "name": disorder["name"],
                "description": (
                    (disorder_descriptions or {}).get(disorder_id) or ""
                ),
                "dsm_code": None,
                "icd9_code": disorder["icd9"],
                "icd10_code": disorder["icd10"],
                "dsm_reference": f"DSM-5 {family['family']}",
                "page": disorder["page"],
                "criterion_ids": [],
                "specifier_ids": [],
                "_specifiers": disorder.get("specifiers", []),
                "rule_id": None,
            }
            disorder_payload.append(record)
            if group_id:
                group_records[group_id]["disorder_ids"].append(disorder_id)
            family_records[fam_id]["disorder_ids"].append(disorder_id)
            detail_lookup = (
                (specifier_details or {}).get(disorder_id, {})
                if specifier_details
                else {}
            )
            for spec in record["_specifiers"]:
                values = []
                local_value_ids: set = set()
                for value in spec.get("values", []):
                    val_id = make_unique_id(
                        slugify_id(value["label"]) or "VALUE", local_value_ids
                    )
                    values.append(
                        {
                            "id": val_id,
                            "label": value["label"],
                            "icd9_code": value.get("icd9_code"),
                            "icd10_code": value.get("icd10_code"),
                        }
                    )
                    detail_text = detail_lookup.get(
                        value["label"].strip().lower()
                    )
                    if detail_text:
                        values[-1]["table_text"] = detail_text
                if not values:
                    continue
                spec_base = (
                    f"SPEC_{disorder_id}_{slugify_id(spec['label'])}"
                    if spec.get("label")
                    else f"SPEC_{disorder_id}"
                )
                spec_id = make_unique_id(spec_base, used_specifier_ids)
                specifier_payload.append(
                    {
                        "id": spec_id,
                        "label": spec.get("label") or "Specifier",
                        "applies_to": "disorder",
                        "applies_to_disorders": [disorder_id],
                        "type": spec.get("type", "enum"),
                        "values": values,
                    }
                )
                record["specifier_ids"].append(spec_id)
            record.pop("_specifiers", None)

        for group in family["groups"]:
            grp_id = group.get("_structured_id")
            for disorder in group["disorders"]:
                register_disorder(disorder, grp_id)

        for disorder in family["disorders"]:
            register_disorder(disorder, None)

    with open(os.path.join(output_dir, "families.json"), "w", encoding="utf-8") as fh:
        json.dump({"families": family_payload}, fh, indent=2)
    with open(os.path.join(output_dir, "groups.json"), "w", encoding="utf-8") as fh:
        json.dump({"groups": group_payload}, fh, indent=2)
    with open(os.path.join(output_dir, "disorders.json"), "w", encoding="utf-8") as fh:
        json.dump({"disorders": disorder_payload}, fh, indent=2)
    with open(os.path.join(output_dir, "specifiers.json"), "w", encoding="utf-8") as fh:
        json.dump({"specifiers": specifier_payload}, fh, indent=2)


def normalize_text_block(text: str) -> str:
    text = re.sub(r"-\s*\n", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_lettered_criteria(text: str) -> List[Dict[str, Any]]:
    pattern = re.compile(r"([A-Z])\.\s+(.*?)(?=\s+[A-Z]\.\s+|$)")
    criteria = []
    for code, description in pattern.findall(text):
        criteria.append(
            {
                "code": code,
                "description": description.strip(),
                "subcriteria": [],
            }
        )
    return criteria


def parse_severity_table(raw_text: str) -> Dict[str, str]:
    start = raw_text.find(
        "TABLE 1 Severity levels for intellectual disability (intellectual developmental disorder)"
    )
    if start == -1:
        return {}
    end = raw_text.find("Global Developmental Delay", start)
    if end == -1:
        end = len(raw_text)
    section = raw_text[start:end]
    entries: Dict[str, str] = {}
    severities = ["Mild", "Moderate", "Severe", "Profound"]
    for idx, label in enumerate(severities):
        s_idx = section.find(label)
        if s_idx == -1:
            continue
        next_indices = [
            section.find(next_label, s_idx + 1)
            for next_label in severities[idx + 1 :]
            if section.find(next_label, s_idx + 1) != -1
        ]
        e_idx = min(next_indices) if next_indices else len(section)
        slice_text = normalize_text_block(section[s_idx:e_idx])
        entries[label.lower()] = slice_text
    return entries


def build_demo_criteria(path: str) -> Tuple[List[Dict[str, Any]], Dict[str, str], Dict[str, Dict[str, str]]]:
    results: List[Dict[str, Any]] = []
    descriptions: Dict[str, str] = {}
    specifier_details: Dict[str, Dict[str, str]] = {}
    for disorder_id, cfg in CRITERIA_DEMO_CONFIG.items():
        start_page, end_page = cfg["pages"]
        raw_text = extract_page_range(path, start_page, end_page)
        normalized = normalize_text_block(raw_text)
        segment = normalized
        start_marker = cfg.get("start_marker")
        if start_marker and start_marker in segment:
            parts = segment.split(start_marker, 1)
            descriptions[disorder_id] = parts[0].strip()
            segment = parts[1]
        note_text = ""
        for end_marker in cfg.get("end_markers", []):
            if end_marker in segment:
                before, after = segment.split(end_marker, 1)
                if end_marker.lower().startswith("note"):
                    note_text = after.strip().split("Specify", 1)[0].strip()
                segment = before
                break
        for end_marker in cfg.get("end_markers", []):
            if end_marker in segment:
                segment = segment.split(end_marker, 1)[0]
                break
        for criterion in parse_lettered_criteria(segment):
            criterion_id = f"{disorder_id}_{criterion['code']}"
            results.append(
                {
                    "id": criterion_id,
                    "disorder_id": disorder_id,
                    "code": criterion["code"],
                    "group": criterion["code"],
                    "type": cfg.get("type", "symptom_cluster"),
                    "description": criterion["description"],
                    "question_suggestion_id": None,
                    "required": True,
                    "subcriteria": criterion["subcriteria"],
                }
            )
        if note_text:
            descriptions[disorder_id] = descriptions.get(disorder_id, "") + " "
            descriptions[disorder_id] += f"\nNOTE: {note_text.strip()}"
        table_details = parse_severity_table(raw_text)
        if table_details:
            specifier_details[disorder_id] = table_details
    return results, descriptions, specifier_details


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DSM-5 classification parser")
    parser.add_argument(
        "--dsm-path",
        default="data/DSM-5-By-American-Psychiatric-Association.pdf",
        help="Path to the DSM-5 PDF file",
    )
    parser.add_argument(
        "--output",
        default="data/dsm_families.json",
        help="Destination JSON file for the parsed hierarchy",
    )
    parser.add_argument(
        "--print-summary",
        action="store_true",
        help="Print the parsed summary to stdout after exporting",
    )
    parser.add_argument(
        "--structured-dir",
        help="If provided, also export split families/groups/disorders JSON files to this directory",
    )
    parser.add_argument(
        "--demo-criteria-output",
        help="Optional path to write proof-of-concept criteria JSON for selected disorders",
    )
    args = parser.parse_args()

    classification_text = get_classification_text(args.dsm_path)
    demo_criteria: List[Dict[str, Any]] = []
    description_overrides: Dict[str, str] = {}
    specifier_details: Dict[str, Dict[str, str]] = {}
    if args.demo_criteria_output or args.structured_dir:
        demo_criteria, description_overrides, specifier_details = build_demo_criteria(
            args.dsm_path
        )
    hierarchy = build_family_hierarchy(classification_text)
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(hierarchy, fh, indent=2)
    print(f"Wrote {len(hierarchy)} families to {args.output}")

    if args.structured_dir:
        export_structured_dataset(
            hierarchy, args.structured_dir, description_overrides, specifier_details
        )
        print(f"Structured dataset written to {args.structured_dir}")

    if args.demo_criteria_output:
        with open(args.demo_criteria_output, "w", encoding="utf-8") as fh:
            json.dump({"criteria": demo_criteria}, fh, indent=2)
        print(f"Wrote {len(demo_criteria)} demo criteria to {args.demo_criteria_output}")

    if args.print_summary:
        for family in hierarchy:
            total_disorders = len(family["disorders"]) + sum(
                len(group["disorders"]) for group in family["groups"]
            )
            print(
                f"{family['page']:>4} {family['family']} "
                f"({len(family['groups'])} groups, {total_disorders} disorders)"
            )
