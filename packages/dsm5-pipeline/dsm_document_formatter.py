"""
Combined DSM PDF extractor + document formatter.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber


# ===========================
# Extraction utilities
# ===========================

def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def _looks_like_page_number(line: str) -> bool:
    return bool(re.match(r"^\s*\d{1,4}\s*(?:[A-Za-z].*)?$", line.strip()))


def _is_mostly_upper(line: str) -> bool:
    letters = re.findall(r"[A-Za-z]", line)
    if len(letters) < 8:
        return False
    upper = sum(1 for ch in letters if ch.isupper())
    return upper / max(len(letters), 1) > 0.75


def _merge_hyphenated_wrap(text: str) -> str:
    return re.sub(r"-\s*\n\s*", "", text)


def _join_soft_linebreaks(text: str) -> str:
    lines = [ln.rstrip() for ln in text.splitlines()]
    out: List[str] = []
    for i, ln in enumerate(lines):
        ln_stripped = ln.strip()
        if not ln_stripped:
            out.append("")
            continue

        if (
            _is_mostly_upper(ln_stripped)
            or re.match(r"^[A-Z]\.\s+", ln_stripped)
            or re.match(r"^\d+\.\s+", ln_stripped)
        ):
            out.append(ln_stripped)
            continue

        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt and ln_stripped[-1] not in ".:;?!" and nxt[0].islower():
                out.append(ln_stripped + " ")
            else:
                out.append(ln_stripped + "\n")
        else:
            out.append(ln_stripped)

    rebuilt = ""
    for chunk in out:
        if chunk == "":
            rebuilt += "\n\n"
        elif chunk.endswith("\n"):
            rebuilt += chunk
        else:
            rebuilt += chunk
    rebuilt = re.sub(r"\n{3,}", "\n\n", rebuilt)
    return rebuilt.strip()


def _cleanup_text(text: str) -> str:
    text = text.replace("\r", "")
    text = _merge_hyphenated_wrap(text)
    text = _join_soft_linebreaks(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    return text.strip()


# ===========================
# Layout reconstruction
# ===========================

@dataclass
class Word:
    text: str
    x0: float
    x1: float
    top: float
    bottom: float


def _extract_words(page: pdfplumber.page.Page) -> List[Word]:
    words_raw = page.extract_words(
        use_text_flow=True,
        keep_blank_chars=False,
        extra_attrs=["x0", "x1", "top", "bottom"],
    ) or []
    words: List[Word] = []
    for w in words_raw:
        t = (w.get("text") or "").strip()
        if not t:
            continue
        words.append(Word(t, float(w["x0"]), float(w["x1"]), float(w["top"]), float(w["bottom"])))
    return words


def _cluster_words_into_lines(words: List[Word], y_tol: float = 3.0) -> List[List[Word]]:
    if not words:
        return []
    words = sorted(words, key=lambda w: (w.top, w.x0))
    lines: List[List[Word]] = []
    current: List[Word] = [words[0]]
    y_ref = words[0].top

    for w in words[1:]:
        if abs(w.top - y_ref) <= y_tol:
            current.append(w)
        else:
            lines.append(sorted(current, key=lambda ww: ww.x0))
            current = [w]
            y_ref = w.top
    if current:
        lines.append(sorted(current, key=lambda ww: ww.x0))
    return lines


def _merge_spaced_letter_words(line_words: List[Word]) -> List[Word]:
    if len(line_words) < 6:
        return line_words
    single_letter = [w for w in line_words if len(w.text) == 1 and w.text.isalpha()]
    if len(single_letter) / max(len(line_words), 1) < 0.6:
        return line_words

    gaps: List[float] = []
    widths: List[float] = []
    for prev, nxt in zip(line_words, line_words[1:]):
        gaps.append(max(0.0, nxt.x0 - prev.x1))
        widths.append(max(0.0, prev.x1 - prev.x0))
    if not gaps:
        return line_words

    gaps_sorted = sorted(gaps)
    p50 = gaps_sorted[len(gaps_sorted) // 2]
    p90_idx = max(0, int(len(gaps_sorted) * 0.9) - 1)
    p90 = gaps_sorted[p90_idx]
    threshold = max(p50 * 1.5, (p50 + p90) / 2.0, 1.0)

    merged: List[Word] = []
    buf_text = line_words[0].text
    buf_x0 = line_words[0].x0
    buf_x1 = line_words[0].x1
    buf_top = line_words[0].top
    buf_bottom = line_words[0].bottom

    for prev, nxt in zip(line_words, line_words[1:]):
        gap = max(0.0, nxt.x0 - prev.x1)
        if gap <= threshold:
            buf_text += nxt.text
            buf_x1 = nxt.x1
            buf_top = min(buf_top, nxt.top)
            buf_bottom = max(buf_bottom, nxt.bottom)
        else:
            merged.append(Word(buf_text, buf_x0, buf_x1, buf_top, buf_bottom))
            buf_text = nxt.text
            buf_x0 = nxt.x0
            buf_x1 = nxt.x1
            buf_top = nxt.top
            buf_bottom = nxt.bottom

    merged.append(Word(buf_text, buf_x0, buf_x1, buf_top, buf_bottom))
    return merged


def _line_text(line_words: List[Word]) -> str:
    if not line_words:
        return ""
    line_words = _merge_spaced_letter_words(line_words)
    text = " ".join(w.text for w in line_words)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _detect_columns(lines: List[Tuple[float, str, float]], page_width: float) -> str:
    if not lines:
        return "one"

    x0s = [x0 for (x0, text, y_top) in lines if len(text) > 3]
    if not x0s:
        return "one"

    mid = page_width / 2.0
    left = [x for x in x0s if x < mid - 20]
    right = [x for x in x0s if x > mid + 20]

    if len(left) >= 10 and len(right) >= 10:
        return "two"
    return "one"


def _order_lines_reading(lines: List[Tuple[float, str, float]], mode: str, page_width: float) -> List[str]:
    if mode == "one":
        return [txt for _, txt, _ in sorted(lines, key=lambda t: t[2])]

    mid = page_width / 2.0
    left = [(x0, txt, y) for x0, txt, y in lines if x0 < mid]
    right = [(x0, txt, y) for x0, txt, y in lines if x0 >= mid]
    left_sorted = [txt for _, txt, _ in sorted(left, key=lambda t: t[2])]
    right_sorted = [txt for _, txt, _ in sorted(right, key=lambda t: t[2])]
    return left_sorted + right_sorted


# ===========================
# Header/footer detection
# ===========================

def build_header_footer_blacklist(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    top_margin: float = 70.0,
    bottom_margin: float = 70.0,
    min_repeat_ratio: float = 0.6,
) -> Dict[str, set]:
    headers_count: Dict[str, int] = {}
    footers_count: Dict[str, int] = {}
    total_pages = 0

    with pdfplumber.open(pdf_path) as pdf:
        p_end = page_end or len(pdf.pages)
        for i in range(page_start - 1, p_end):
            page = pdf.pages[i]
            total_pages += 1
            words = _extract_words(page)
            if not words:
                continue

            lines = _cluster_words_into_lines(words)
            for lw in lines:
                txt = _line_text(lw)
                if not txt:
                    continue
                y_top = min(w.top for w in lw)
                y_bot = max(w.bottom for w in lw)
                if y_top <= top_margin:
                    headers_count[txt] = headers_count.get(txt, 0) + 1
                if (page.height - y_bot) <= bottom_margin:
                    footers_count[txt] = footers_count.get(txt, 0) + 1

    headers = {t for t, c in headers_count.items() if c / max(total_pages, 1) >= min_repeat_ratio}
    footers = {t for t, c in footers_count.items() if c / max(total_pages, 1) >= min_repeat_ratio}
    footers |= {t for t in footers if _looks_like_page_number(t)}

    return {"headers": headers, "footers": footers}


# ===========================
# Table extraction
# ===========================

def _extract_tables_best_effort(page: pdfplumber.page.Page) -> List[Dict[str, Any]]:
    settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "intersection_tolerance": 5,
        "snap_tolerance": 3,
        "join_tolerance": 3,
        "edge_min_length": 20,
        "min_words_vertical": 2,
        "min_words_horizontal": 2,
        "text_tolerance": 3,
    }

    tables_out: List[Dict[str, Any]] = []
    try:
        tables = page.find_tables(table_settings=settings) or []
        for t in tables:
            bbox = t.bbox
            rows = t.extract()
            cleaned_rows = []
            for row in rows:
                cleaned_rows.append([_norm(cell) if cell else "" for cell in row])
            tables_out.append({"bbox": bbox, "rows": cleaned_rows})
    except Exception:
        pass

    return tables_out


def _word_in_any_bbox(w: Word, bboxes: List[Tuple[float, float, float, float]], pad: float = 2.0) -> bool:
    for (x0, top, x1, bottom) in bboxes:
        if (w.x0 >= x0 - pad and w.x1 <= x1 + pad and w.top >= top - pad and w.bottom <= bottom + pad):
            return True
    return False


# ===========================
# Main extraction
# ===========================

def extract_dsm_pages_structured(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    header_footer_blacklist: Optional[Dict[str, set]] = None,
    remove_headers_footers: bool = True,
    remove_table_text_from_flow: bool = True,
    extract_tables: bool = True,
    top_margin: float = 70.0,
    bottom_margin: float = 70.0,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    headers_bl = (header_footer_blacklist or {}).get("headers", set())
    footers_bl = (header_footer_blacklist or {}).get("footers", set())

    with pdfplumber.open(pdf_path) as pdf:
        p_end = page_end or len(pdf.pages)

        for i in range(page_start - 1, p_end):
            page = pdf.pages[i]
            words = _extract_words(page)
            tables = _extract_tables_best_effort(page) if extract_tables else []

            table_bboxes = [tuple(t["bbox"]) for t in tables] if tables else []
            if remove_table_text_from_flow and table_bboxes:
                words_flow = [w for w in words if not _word_in_any_bbox(w, table_bboxes)]
            else:
                words_flow = words

            line_groups = _cluster_words_into_lines(words_flow)
            line_tuples: List[Tuple[float, str, float]] = []
            headers_found: List[str] = []
            footers_found: List[str] = []

            for lw in line_groups:
                txt = _line_text(lw)
                if not txt:
                    continue
                y_top = min(w.top for w in lw)
                y_bot = max(w.bottom for w in lw)
                x0_min = min(w.x0 for w in lw)

                in_header = y_top <= top_margin
                in_footer = (page.height - y_bot) <= bottom_margin

                if in_header:
                    headers_found.append(txt)
                if in_footer:
                    footers_found.append(txt)

                if remove_headers_footers and (txt in headers_bl or txt in footers_bl):
                    continue
                if remove_headers_footers and in_footer and _looks_like_page_number(txt):
                    continue

                line_tuples.append((x0_min, txt, y_top))

            mode = _detect_columns(line_tuples, page.width)
            ordered_lines = _order_lines_reading(line_tuples, mode, page.width)

            raw_text = "\n".join(ordered_lines)
            cleaned = _cleanup_text(raw_text)

            results.append(
                {
                    "page": i + 1,
                    "text": cleaned,
                    "headers": sorted(set(headers_found)),
                    "footers": sorted(set(footers_found)),
                    "tables": tables,
                    "debug": {"column_mode": mode, "num_words": len(words), "num_tables": len(tables)},
                }
            )

    return results


def extract_dsm_clean_text(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    blacklist_scan_start: Optional[int] = None,
    blacklist_scan_end: Optional[int] = None,
    remove_headers_footers: bool = True,
    remove_table_text_from_flow: bool = True,
    extract_tables: bool = True,
) -> Dict[str, Any]:
    scan_start = blacklist_scan_start or page_start
    scan_end = blacklist_scan_end or page_end

    blacklist = build_header_footer_blacklist(
        pdf_path,
        page_start=scan_start,
        page_end=scan_end,
        min_repeat_ratio=0.6,
    )

    pages = extract_dsm_pages_structured(
        pdf_path,
        page_start=page_start,
        page_end=page_end,
        header_footer_blacklist=blacklist,
        remove_headers_footers=remove_headers_footers,
        remove_table_text_from_flow=remove_table_text_from_flow,
        extract_tables=extract_tables,
    )

    return {
        "blacklist": {"headers": sorted(blacklist["headers"]), "footers": sorted(blacklist["footers"])},
        "pages": pages,
    }


# ===========================
# Formatting utilities
# ===========================

HEADER_PATTERNS = [
    re.compile(r"^\s*\d{1,4}\s+[A-Z][A-Za-z].*(Disorder|Disorders)\s*$"),
    re.compile(r"^\s*[A-Z][A-Za-z].*(Disorder|Disorders)\s+\d{1,4}\s*$"),
    re.compile(r"^\s*Depressive\s+Disorders\s*$", re.IGNORECASE),
]


def remove_running_headers(text: str) -> str:
    text = re.sub(r"\s*\b\d{1,4}\s+Depressive\s+Disorders\b\s*", " ", text)
    text = re.sub(r"\s*\bMajor\s+Depressive\s+Disorder\s+\d{1,4}\b\s*", " ", text)
    text = re.sub(r"\s*\bDepressive\s+Disorders\b\s*", " ", text)

    lines = text.splitlines()
    kept = []
    for ln in lines:
        if any(p.match(ln.strip()) for p in HEADER_PATTERNS):
            continue
        kept.append(ln)
    return "\n".join(kept)


def fix_hyphen_linebreaks(text: str) -> str:
    return re.sub(r"-\s*\n\s*", "", text)


def normalize_spaces(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)

    text = re.sub(r",(?=\S)", ", ", text)
    text = re.sub(r";(?=\S)", "; ", text)
    text = re.sub(r":(?=\S)", ": ", text)

    text = re.sub(r"([A-Za-z0-9])\(", r"\1 (", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)

    return text.strip()


def collapse_spaced_letters(text: str) -> str:
    def _collapse(match: re.Match) -> str:
        return match.group(0).replace(" ", "")

    text = re.sub(r"(?<!\w)(?:[A-Za-z]\s){2,}[A-Za-z](?!\w)", _collapse, text)
    text = re.sub(r"(?<!\d)(?:\d\s){1,}\d(?!\d)", _collapse, text)
    return text


def normalize_icd_codes(text: str) -> str:
    def compact(code: str) -> str:
        return re.sub(r"\s+", "", code)

    text = re.sub(
        r"\(\s*F\s*([0-9][0-9.\s]*)\)",
        lambda m: f"(F{compact(m.group(1))})",
        text,
    )
    text = re.sub(
        r"\bF\s*([0-9][0-9.\s]*[0-9])\b",
        lambda m: f"F{compact(m.group(1))}",
        text,
    )
    return text


def insert_section_breaks(text: str) -> str:
    text = re.sub(r"\n(?=[A-Z][A-Za-z].*(Disorder|Disorders)\b)", "\n\n", text)
    text = re.sub(r"\s*(Note:)\s*", r"\n\n\1 ", text)
    return text


def format_lettered_criteria(text: str) -> str:
    text = re.sub(r"\s*([A-Z])\.\s*", r"\n\n\1.\n", text)
    text = re.sub(
        r"\bCriteria\s+([A-Z])\s*[\u2013-]\s*([A-Z])\b",
        lambda m: f"Criteria {m.group(1)}{chr(8211)}{m.group(2)}",
        text,
    )
    return text


def format_numbered_list(text: str) -> str:
    text = re.sub(r"(\b\d{1,2})\.\s*", r"\1. ", text)
    text = re.sub(r"(?<!\n)(\b\d{1,2}\.)\s*", r"\n\n\1 ", text)
    return text


def format_notes_and_coding(text: str) -> str:
    text = re.sub(r"\s*(Coding and Recording Procedures)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Recording Procedures)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Specify:)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Specify if:)\s*", r"\n\n\1\n", text)
    return text


def deglue_common_collapses(text: str) -> str:
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([A-Za-z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([A-Za-z])", r"\1 \2", text)
    return text


def cleanup_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def format_as_document(pages_text: List[str]) -> str:
    raw = "\n".join(pages_text)

    raw = fix_hyphen_linebreaks(raw)
    raw = normalize_icd_codes(raw)
    raw = remove_running_headers(raw)

    raw = normalize_spaces(raw)
    raw = collapse_spaced_letters(raw)
    raw = deglue_common_collapses(raw)

    raw = insert_section_breaks(raw)
    raw = format_lettered_criteria(raw)
    raw = format_numbered_list(raw)
    raw = format_notes_and_coding(raw)

    return cleanup_blank_lines(raw)


# ===========================
# Markdown formatting
# ===========================

_H2_HEADINGS = {
    "Diagnostic Criteria",
    "Coding and Recording Procedures",
    "Recording the Diagnosis Name",
    "Specifiers",
}

_H3_HEADINGS = {
    "Severity / Course Specifiers",
    "Specify if:",
}


def _is_disorder_heading(line: str) -> bool:
    if "(p." in line or "(pp." in line:
        return False
    if re.match(r"^(Mild|Moderate|Severe|With|In)\b", line):
        return False
    return bool(re.match(r"^[A-Z][A-Za-z].*(Disorder|Disorders)\b$", line))


def _bold_list_lead(line: str) -> str:
    m = re.match(r"^(\d+\.\s+)([^,.;:]+)(.*)$", line)
    if not m:
        return line
    lead = m.group(2).strip()
    if len(lead.split()) > 6:
        return line
    return f"{m.group(1)}**{lead}**{m.group(3)}"


def _format_markdown_table(rows: List[List[str]]) -> List[str]:
    if not rows:
        return []
    cleaned = [[(cell or "").replace("|", "\\|").strip() for cell in row] for row in rows]
    width = max(len(row) for row in cleaned)
    normalized = [row + [""] * (width - len(row)) for row in cleaned]
    header = normalized[0]
    sep = ["---"] * width
    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(sep) + " |",
    ]
    for row in normalized[1:]:
        lines.append("| " + " | ".join(row) + " |")
    return lines


def format_as_markdown(pages: List[Dict[str, Any]]) -> str:
    raw = "\n".join(p.get("text", "") for p in pages)

    raw = fix_hyphen_linebreaks(raw)
    raw = normalize_icd_codes(raw)
    raw = remove_running_headers(raw)
    raw = normalize_spaces(raw)
    raw = collapse_spaced_letters(raw)
    raw = deglue_common_collapses(raw)

    lines = [ln.strip() for ln in raw.splitlines()]
    out_lines: List[str] = []
    in_blockquote = False
    in_specify_list = False

    for ln in lines:
        if not ln:
            out_lines.append("")
            in_blockquote = False
            in_specify_list = False
            continue

        if _is_disorder_heading(ln):
            out_lines.extend(["", f"# {ln}", ""])
            in_blockquote = False
            continue

        if ln in _H2_HEADINGS:
            out_lines.extend(["", f"## {ln}", ""])
            in_blockquote = False
            continue

        if ln in _H3_HEADINGS:
            out_lines.extend(["", f"### {ln}", ""])
            in_blockquote = False
            in_specify_list = ln == "Specify if:"
            continue

        if re.match(r"^[A-Z]\.$", ln):
            out_lines.extend(["", f"### {ln}", ""])
            in_blockquote = False
            in_specify_list = False
            continue

        if re.match(r"^Note:", ln, re.IGNORECASE):
            note_body = re.sub(r"^Note:\s*", "", ln, flags=re.IGNORECASE)
            out_lines.append(f"> **Note:** {note_body}".rstrip())
            in_blockquote = True
            in_specify_list = False
            continue

        if ln.startswith("Connected footnote"):
            out_lines.append(f"> {ln}")
            in_blockquote = True
            in_specify_list = False
            continue

        if re.match(r"^\d+\.\s+", ln):
            out_lines.append(_bold_list_lead(ln))
            in_blockquote = False
            in_specify_list = False
            continue

        if in_specify_list and re.match(r"^(With|Without|In)\b", ln):
            out_lines.append(f"- {ln}")
            continue

        if in_blockquote:
            out_lines.append(f"> {ln}")
            continue

        out_lines.append(ln)

    out_lines.append("")
    for page in pages:
        tables = page.get("tables") or []
        for table in tables:
            rows = table.get("rows") or []
            md_table = _format_markdown_table(rows)
            if md_table:
                out_lines.extend(["", "### Table", *md_table, ""])

    return cleanup_blank_lines("\n".join(out_lines))


# ===========================
# CLI
# ===========================


def _ensure_parent_dir(path: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--start", type=int, required=True)
    ap.add_argument("--end", type=int, required=True)
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-doc")
    ap.add_argument("--doc-format", choices=["txt", "md"], default="txt")
    ap.add_argument("--no-tables", action="store_true", default=False)
    ap.add_argument("--no-header-footer-removal", action="store_true", default=False)
    args = ap.parse_args()

    extracted = extract_dsm_clean_text(
        args.pdf,
        page_start=args.start,
        page_end=args.end,
        remove_headers_footers=not args.no_header_footer_removal,
        remove_table_text_from_flow=not args.no_tables,
        extract_tables=not args.no_tables,
    )

    _ensure_parent_dir(args.out_json)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=False)

    print(f"Wrote structured extraction to {os.path.abspath(args.out_json)}")

    if args.out_doc:
        pages = extracted.get("pages", [])
        if args.doc_format == "md":
            doc = format_as_markdown(pages)
        else:
            pages_text = [p.get("text", "") for p in pages]
            doc = format_as_document(pages_text)
        _ensure_parent_dir(args.out_doc)
        with open(args.out_doc, "w", encoding="utf-8") as f:
            f.write(doc)
        print(f"Wrote formatted document to {os.path.abspath(args.out_doc)}")


if __name__ == "__main__":
    main()
