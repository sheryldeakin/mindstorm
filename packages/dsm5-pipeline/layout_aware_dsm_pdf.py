"""
layout_aware_dsm_pdf.py

Layout-aware DSM-style PDF extraction with pdfplumber.

What it does (DSM-friendly):
- Extracts words with coordinates (not just extract_text())
- Reconstructs reading order with simple 1- or 2-column detection
- Detects and removes repeating headers/footers (by frequency across pages)
- Extracts tables separately (best-effort) and removes their text from narrative flow
- Returns structured per-page output: {page, text, headers, footers, tables, debug}

Notes:
- This is heuristic (PDFs vary), but works well for DSM-like manuals.
- You should run it once to build header/footer “candidates” over many pages, then extract clean text.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber


# ---------------------------
# Utilities
# ---------------------------

def _norm(s: str) -> str:
    s = re.sub(r"\s+", " ", (s or "").strip())
    return s


def _looks_like_page_number(line: str) -> bool:
    # DSM often has page numbers in footer like "20 Neurodevelopmental Disorders"
    # This catches "20 ..." or just "20"
    return bool(re.match(r"^\s*\d{1,4}\s*(?:[A-Za-z].*)?$", line.strip()))


def _is_mostly_upper(line: str) -> bool:
    letters = re.findall(r"[A-Za-z]", line)
    if len(letters) < 8:
        return False
    upper = sum(1 for ch in letters if ch.isupper())
    return upper / max(len(letters), 1) > 0.75


def _merge_hyphenated_wrap(text: str) -> str:
    # join "develop-\nmental" -> "developmental"
    text = re.sub(r"-\s*\n\s*", "", text)
    return text


def _join_soft_linebreaks(text: str) -> str:
    """
    Join line breaks that are likely paragraph wraps.
    Keep line breaks when they look like headings/bullets.
    """
    lines = [ln.rstrip() for ln in text.splitlines()]
    out: List[str] = []
    for i, ln in enumerate(lines):
        ln_stripped = ln.strip()
        if not ln_stripped:
            out.append("")
            continue

        # Keep hard breaks for likely headings or list items
        if _is_mostly_upper(ln_stripped) or re.match(r"^[A-Z]\.\s+", ln_stripped) or re.match(r"^\d+\.\s+", ln_stripped):
            out.append(ln_stripped)
            continue

        # If next line continues a sentence, merge
        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt and ln_stripped[-1] not in ".:;?!" and nxt[0].islower():
                out.append(ln_stripped + " ")
            else:
                out.append(ln_stripped + "\n")
        else:
            out.append(ln_stripped)

    # Rebuild while respecting the inserted "\n" markers
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
    # collapse excessive spaces but keep newlines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    return text.strip()


# ---------------------------
# Layout reconstruction
# ---------------------------

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
    """
    Group words into lines by 'top' coordinate with tolerance.
    """
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


def _line_text(line_words: List[Word], x_gap_tol: float = 2.0) -> str:
    """
    Join words in a line with spaces where gaps are large enough.
    """
    if not line_words:
        return ""
    parts = [line_words[0].text]
    for prev, w in zip(line_words, line_words[1:]):
        gap = w.x0 - prev.x1
        parts.append((" " if gap > x_gap_tol else "") + w.text)
    return _norm("".join(parts))


def _detect_columns(lines: List[Tuple[float, str, float]], page_width: float) -> str:
    """
    Decide if page is 1-column or 2-column using line x0 distribution.
    Input lines: (x0_min, text, y_top)
    """
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
    """
    Order lines into reading order.
    lines: (x0_min, text, y_top)
    """
    if mode == "one":
        return [txt for _, txt, _ in sorted(lines, key=lambda t: t[2])]  # y order

    # two columns: read left column top->bottom, then right column top->bottom
    mid = page_width / 2.0
    left = [(x0, txt, y) for x0, txt, y in lines if x0 < mid]
    right = [(x0, txt, y) for x0, txt, y in lines if x0 >= mid]
    left_sorted = [txt for _, txt, _ in sorted(left, key=lambda t: t[2])]
    right_sorted = [txt for _, txt, _ in sorted(right, key=lambda t: t[2])]
    return left_sorted + right_sorted


# ---------------------------
# Header/footer detection
# ---------------------------

def build_header_footer_blacklist(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    top_margin: float = 70.0,
    bottom_margin: float = 70.0,
    min_repeat_ratio: float = 0.6,
) -> Dict[str, set]:
    """
    First pass: scan pages and find lines that repeat frequently in top/bottom margins.
    Returns sets: {"headers": set(str), "footers": set(str)}
    """
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

    # Also treat pure page number-ish lines as footers
    footers |= {t for t in footers if _looks_like_page_number(t)}

    return {"headers": headers, "footers": footers}


# ---------------------------
# Table extraction
# ---------------------------

def _extract_tables_best_effort(page: pdfplumber.page.Page) -> List[Dict[str, Any]]:
    """
    Best-effort table extraction. For DSM PDFs, line-drawn tables often work well.
    Returns list of {bbox, rows}.
    """
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
            bbox = t.bbox  # (x0, top, x1, bottom)
            rows = t.extract()  # list of lists (strings)
            # Basic cleanup
            cleaned_rows = []
            for row in rows:
                cleaned_rows.append([_norm(cell) if cell else "" for cell in row])
            tables_out.append({"bbox": bbox, "rows": cleaned_rows})
    except Exception:
        # Some PDFs/pages won't support line-based tables
        pass

    return tables_out


def _word_in_any_bbox(w: Word, bboxes: List[Tuple[float, float, float, float]], pad: float = 2.0) -> bool:
    for (x0, top, x1, bottom) in bboxes:
        if (w.x0 >= x0 - pad and w.x1 <= x1 + pad and w.top >= top - pad and w.bottom <= bottom + pad):
            return True
    return False


# ---------------------------
# Main extraction
# ---------------------------

def extract_dsm_pages_structured(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    header_footer_blacklist: Optional[Dict[str, set]] = None,
    remove_headers_footers: bool = True,
    remove_table_text_from_flow: bool = True,
    top_margin: float = 70.0,
    bottom_margin: float = 70.0,
) -> List[Dict[str, Any]]:
    """
    Extract structured per-page objects:
    - page_number (1-based)
    - text (cleaned narrative text)
    - headers, footers (captured lines)
    - tables (bbox + rows)
    - debug info (column mode)
    """
    results: List[Dict[str, Any]] = []

    headers_bl = (header_footer_blacklist or {}).get("headers", set())
    footers_bl = (header_footer_blacklist or {}).get("footers", set())

    with pdfplumber.open(pdf_path) as pdf:
        p_end = page_end or len(pdf.pages)

        for i in range(page_start - 1, p_end):
            page = pdf.pages[i]
            words = _extract_words(page)
            tables = _extract_tables_best_effort(page)

            table_bboxes = [tuple(t["bbox"]) for t in tables] if tables else []
            if remove_table_text_from_flow and table_bboxes:
                words_flow = [w for w in words if not _word_in_any_bbox(w, table_bboxes)]
            else:
                words_flow = words

            # Cluster into lines
            line_groups = _cluster_words_into_lines(words_flow)
            # Convert to line tuples: (x0_min, text, y_top, y_bottom)
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

                # Optionally drop known repeating header/footer lines from flow
                if remove_headers_footers and (txt in headers_bl or txt in footers_bl):
                    continue
                # Also drop pure page-number footer lines by heuristic
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


# ---------------------------
# Convenience wrapper
# ---------------------------

def extract_dsm_clean_text(
    pdf_path: str,
    page_start: int = 1,
    page_end: Optional[int] = None,
    blacklist_scan_start: Optional[int] = None,
    blacklist_scan_end: Optional[int] = None,
) -> Dict[str, Any]:
    """
    One-stop helper:
    1) Build header/footer blacklist from a scan range (defaults to extraction range)
    2) Extract structured pages with headers/footers removed and tables separated

    Returns:
    {
      "blacklist": {"headers": [...], "footers": [...]},
      "pages": [ {page, text, tables, debug, ...}, ... ]
    }
    """
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
        remove_headers_footers=True,
        remove_table_text_from_flow=True,
    )

    return {"blacklist": {"headers": sorted(blacklist["headers"]), "footers": sorted(blacklist["footers"])}, "pages": pages}


# ---------------------------
# Example usage
# ---------------------------
if __name__ == "__main__":
    import json
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--out", default="dsm_extracted.json")
    args = ap.parse_args()

    out = extract_dsm_clean_text(args.pdf, page_start=args.start, page_end=args.end)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f"Wrote structured extraction to {args.out}")
