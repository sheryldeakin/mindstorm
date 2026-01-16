import re
from typing import List

# Running header patterns (standalone lines)
HEADER_PATTERNS = [
    # "94 Depressive Disorders"
    re.compile(r"^\s*\d{1,4}\s+[A-Z][A-Za-z].*(Disorder|Disorders)\s*$"),
    # "Major Depressive Disorder 95"
    re.compile(r"^\s*[A-Z][A-Za-z].*(Disorder|Disorders)\s+\d{1,4}\s*$"),
    # Section title sometimes repeats
    re.compile(r"^\s*Depressive\s+Disorders\s*$", re.IGNORECASE),
]

def remove_running_headers(text: str) -> str:
    """
    Remove running headers when they appear as standalone lines,
    and also remove common running header patterns when embedded in text.
    """
    # 1) Remove embedded patterns like " 94 Depressive Disorders " anywhere in the text
    #    This targets the exact noise you saw mid-paragraph.
    text = re.sub(r"\s+\d{1,4}\s+Depressive\s+Disorders\s+", " ", text)

    # 2) Now remove standalone header lines
    lines = text.splitlines()
    kept = []
    for ln in lines:
        if any(p.match(ln.strip()) for p in HEADER_PATTERNS):
            continue
        kept.append(ln)
    return "\n".join(kept)

def fix_hyphen_linebreaks(text: str) -> str:
    # join "ma-\njor" -> "major"
    return re.sub(r"-\s*\n\s*", "", text)

def normalize_spaces(text: str) -> str:
    """
    Collapse excessive spaces, keep newlines.
    Also fix common punctuation spacing issues that DSM PDFs create.
    """
    # normalize whitespace but keep newlines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)

    # add missing spaces after commas/semicolons/colons if stuck: "occur,on" -> "occur, on"
    text = re.sub(r",(?=\S)", ", ", text)
    text = re.sub(r";(?=\S)", "; ", text)
    text = re.sub(r":(?=\S)", ": ", text)

    # add missing space before "(" if attached: "Five(" -> "Five ("
    text = re.sub(r"([A-Za-z0-9])\(", r"\1 (", text)

    # remove extra spaces before punctuation: "day , nearly" -> "day, nearly"
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    # tighten spaces inside parentheses: "( F 32. 0 )" -> "(F 32. 0)"
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)

    return text.strip()

def normalize_codes(text: str) -> str:
    """
    Fix split ICD patterns like:
      (F \n 34. 8)  -> (F34.8)
      (F 34. 8)    -> (F34.8)
    """
    # collapse line breaks inside (F...)
    text = re.sub(r"\(\s*F\s*\n\s*([0-9. ]+)\)", lambda m: f"(F{m.group(1).replace(' ', '')})", text)
    # collapse spaces inside (F ..)
    text = re.sub(r"\(\s*F\s*([0-9. ]+)\)", lambda m: f"(F{m.group(1).replace(' ', '')})", text)
    return text

def insert_section_breaks(text: str) -> str:
    # blank lines before headings that look like disorder names
    text = re.sub(r"\n(?=[A-Z][A-Za-z].*(Disorder|Disorders)\b)", "\n\n", text)
    # Notes: start new paragraph
    text = re.sub(r"\s*(Note:)\s*", r"\n\n\1 ", text)
    return text

def format_lettered_criteria(text: str) -> str:
    # Ensure "A." "B." ... "Z." each start a new block
    text = re.sub(r"\s*([A-Z])\.\s*", r"\n\n\1.\n", text)

    # Handle criteria ranges like "Criteria A–C"
    text = re.sub(r"\bCriteria\s+([A-Z])\s*[–-]\s*([A-Z])\b", r"Criteria \1–\2", text)

    return text

def format_numbered_list(text: str) -> str:
    """
    Make numbered criteria list items each start on a new paragraph.
    Handles cases where PDF collapses: "5. ...6. ...7. ..."
    """
    # Ensure space after period in "5." if missing
    text = re.sub(r"(\b\d{1,2})\.\s*", r"\1. ", text)

    # Split when a number+dot appears mid-sentence
    text = re.sub(r"(?<!\n)(\b\d{1,2}\.)\s*", r"\n\n\1 ", text)

    return text

def format_notes_and_coding(text: str) -> str:
    # Add spacing before key headings
    text = re.sub(r"\s*(Coding and Recording Procedures)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Recording Procedures)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Specify:)\s*", r"\n\n\1\n", text)
    text = re.sub(r"\s*(Specify if:)\s*", r"\n\n\1\n", text)
    return text

def deglue_common_collapses(text: str) -> str:
    """
    Fix some common PDF glue artifacts.
    NOTE: This cannot fully fix cases where extractor removed ALL spaces between words.
    But it helps:
      - digit/letter glue
      - lowercase->Uppercase glue
    """
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([A-Za-z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([A-Za-z])", r"\1 \2", text)
    return text

def cleanup_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def format_as_document(pages_text: List[str]) -> str:
    raw = "\n".join(pages_text)

    raw = fix_hyphen_linebreaks(raw)
    raw = normalize_codes(raw)
    raw = remove_running_headers(raw)

    raw = normalize_spaces(raw)
    raw = deglue_common_collapses(raw)

    raw = insert_section_breaks(raw)
    raw = format_lettered_criteria(raw)
    raw = format_numbered_list(raw)
    raw = format_notes_and_coding(raw)

    return cleanup_blank_lines(raw)
