#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/eduardosalvador/clawd/projects/bidbench')
from pdf_parser import extract_text_from_pdf
if len(sys.argv) < 2:
    print("Usage: extract-pdf.py <path>", file=sys.stderr)
    sys.exit(1)
print(extract_text_from_pdf(sys.argv[1]))
