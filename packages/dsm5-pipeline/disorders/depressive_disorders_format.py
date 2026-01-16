import json
import os
from dsm_document_formatter import format_as_document

# Input
in_path = "packages/dsm5-pipeline/data/disorders/Depressive_Disorders.json"

# Output (NEW file)
out_path = "packages/dsm5-pipeline/data/disorders/Depressive_Disorders_formatted.txt"

# Load extracted pages
with open(in_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Select pages for the whole depressive disorders section
pages = [p for p in data["pages"] if 142 <= p["page"] <= 163]
pages_text = [p["text"] for p in pages]

# Format into a clean document
doc = format_as_document(pages_text)

# Ensure output directory exists
os.makedirs(os.path.dirname(out_path), exist_ok=True)

# Write to file
with open(out_path, "w", encoding="utf-8") as f:
    f.write(doc)

print(f"Wrote formatted document to {os.path.abspath(out_path)}")
