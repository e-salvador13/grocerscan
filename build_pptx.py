#!/usr/bin/env python3
"""Build GrocerScan Presentation — 10 slides, no emojis, dark navy design."""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Colors ──────────────────────────────────────────────────────────────────
BG      = RGBColor(0x1A, 0x1A, 0x2E)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
GREEN   = RGBColor(0x0D, 0x63, 0x1B)
PURPLE  = RGBColor(0x4C, 0x56, 0xAF)
BLUE    = RGBColor(0x1A, 0x6E, 0xD8)
ORANGE  = RGBColor(0xD4, 0x7B, 0x2A)
RED     = RGBColor(0xC0, 0x39, 0x2B)
MUTED   = RGBColor(0x99, 0x99, 0xBB)
CARD_BG = RGBColor(0x24, 0x24, 0x3E)
DARK_CARD = RGBColor(0x20, 0x20, 0x38)
LIGHT_GREEN = RGBColor(0x27, 0xAE, 0x60)
LIGHT_PURPLE = RGBColor(0x7C, 0x83, 0xDB)

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

# ── Helpers ─────────────────────────────────────────────────────────────────

def set_bg(slide):
    bg = slide.background
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG

def add_textbox(slide, left, top, width, height, text, font_size=18,
                color=WHITE, bold=False, alignment=PP_ALIGN.LEFT,
                font_name="Calibri", anchor=MSO_ANCHOR.TOP):
    txBox = slide.shapes.add_textbox(Inches(left), Inches(top),
                                      Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf.vertical_anchor = anchor
    except:
        pass
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_para(text_frame, text, font_size=16, color=WHITE, bold=False,
             alignment=PP_ALIGN.LEFT, font_name="Calibri", space_before=0, space_after=0):
    p = text_frame.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    if space_before:
        p.space_before = Pt(space_before)
    if space_after:
        p.space_after = Pt(space_after)
    return p

def add_rounded_rect(slide, left, top, width, height, fill_color):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    # Reduce corner rounding
    try:
        shape.adjustments[0] = 0.05
    except:
        pass
    return shape

def add_rect(slide, left, top, width, height, fill_color):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

def shape_text(shape, text, font_size=14, color=WHITE, bold=False,
               alignment=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font_name="Calibri"):
    tf = shape.text_frame
    tf.word_wrap = True
    try:
        tf.vertical_anchor = anchor
    except:
        pass
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return tf

def add_arrow(slide, left, top, width, height):
    """Add a right-pointing arrow shape."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RIGHT_ARROW,
        Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = MUTED
    shape.line.fill.background()
    return shape

def add_green_line(slide, left, top, width):
    """Add a thin green accent line."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(0.04))
    shape.fill.solid()
    shape.fill.fore_color.rgb = GREEN
    shape.line.fill.background()
    return shape

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 1: Title
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

# Green accent line at top
add_rect(slide, 0, 0, 13.333, 0.06, GREEN)

add_textbox(slide, 1, 1.5, 11.333, 1.2, "GrocerScan", 60, WHITE, True, PP_ALIGN.CENTER, "Calibri")
add_green_line(slide, 5.5, 2.65, 2.333)
add_textbox(slide, 1.5, 2.9, 10.333, 0.8,
            "AI-Driven Grocery Receipt Price Comparison Platform",
            26, MUTED, False, PP_ALIGN.CENTER, "Calibri")

add_textbox(slide, 1.5, 4.4, 10.333, 0.6,
            "Eduardo Salvador  |  Pragya Kunwar  |  Hellen Nyokusi  |  Srawan Bhatt",
            20, WHITE, False, PP_ALIGN.CENTER, "Calibri")

add_textbox(slide, 1.5, 5.5, 10.333, 0.5,
            "BUPM-634-M20  |  Initiating the Project  |  Spring 2026",
            16, MUTED, False, PP_ALIGN.CENTER, "Calibri")

# Purple accent line at bottom
add_rect(slide, 0, 7.44, 13.333, 0.06, PURPLE)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 2: Problem Overview
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.3, 6, 0.7, "Problem Overview", 36, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.95, 2.5)

# Big stat card
card = add_rounded_rect(slide, 0.6, 1.4, 4.0, 2.8, CARD_BG)
shape_text(card, "", 14, WHITE)
# Overlay textboxes for the stat
add_textbox(slide, 0.9, 1.55, 3.4, 0.9, "$270/week", 48, LIGHT_GREEN, True, PP_ALIGN.CENTER)
add_textbox(slide, 0.9, 2.45, 3.4, 0.5, "Average Household", 18, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, 0.9, 2.85, 3.4, 0.5, "Grocery Spend", 18, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, 0.9, 3.35, 3.4, 0.6, "25% inflation from 2020-2024", 14, MUTED, False, PP_ALIGN.CENTER)

# Key points card on the right
card2 = add_rounded_rect(slide, 5.2, 1.4, 7.5, 2.8, CARD_BG)
shape_text(card2, "", 14, WHITE)

tb = add_textbox(slide, 5.5, 1.55, 6.9, 2.5, "", 16, WHITE)
tf = tb.text_frame
tf.paragraphs[0].text = "The Problem"
tf.paragraphs[0].font.size = Pt(20)
tf.paragraphs[0].font.bold = True
tf.paragraphs[0].font.color.rgb = WHITE
tf.paragraphs[0].space_after = Pt(8)

bullets = [
    "Prices for identical products vary 15-40% across retailers in the same ZIP code",
    "No efficient tool for item-level cross-store comparison",
    "Existing solutions are fragmented -- individual store apps, coupon aggregators",
]
for b in bullets:
    add_para(tf, "  " + b, 14, WHITE, space_before=4, space_after=2)

# Bottom stat cards - overspending highlight
card3 = add_rounded_rect(slide, 0.6, 4.6, 5.8, 1.8, CARD_BG)
shape_text(card3, "", 14, WHITE)
add_textbox(slide, 0.9, 4.75, 5.2, 0.7, "$1,200 - $2,400", 36, LIGHT_GREEN, True, PP_ALIGN.CENTER)
add_textbox(slide, 0.9, 5.4, 5.2, 0.5, "Annual overspending per household", 16, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, 0.9, 5.85, 5.2, 0.4, "due to price variation across retailers", 13, MUTED, False, PP_ALIGN.CENTER)

card4 = add_rounded_rect(slide, 6.8, 4.6, 5.9, 1.8, CARD_BG)
shape_text(card4, "", 14, WHITE)
add_textbox(slide, 7.1, 4.75, 5.3, 0.7, "15-40%", 36, LIGHT_GREEN, True, PP_ALIGN.CENTER)
add_textbox(slide, 7.1, 5.4, 5.3, 0.5, "Price variance for identical products", 16, WHITE, False, PP_ALIGN.CENTER)
add_textbox(slide, 7.1, 5.85, 5.3, 0.4, "across retailers in the same ZIP code", 13, MUTED, False, PP_ALIGN.CENTER)

# Bottom accent
add_rect(slide, 0, 7.44, 13.333, 0.06, GREEN)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 3: AI Solution
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.2, 8, 0.6, "AI Solution -- GrocerScan", 32, WHITE, True, PP_ALIGN.LEFT)
add_textbox(slide, 0.6, 0.75, 10, 0.4, "Upload a receipt. See where you overpaid. Save money.", 16, MUTED, False, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 1.1, 2.0)

# Flow diagram - 5 boxes with arrows
flow_labels = ["Receipt\nPhoto", "OCR Extraction\n(Tesseract.js)", "Fuzzy Matching\n(Fuse.js)", "Price Database\n(6 stores)", "Savings\nAnalysis"]
flow_colors = [GREEN, PURPLE, PURPLE, BLUE, GREEN]
box_w = 1.9
box_h = 0.85
arrow_w = 0.35
start_x = 0.6
y = 1.35

for i, (label, clr) in enumerate(zip(flow_labels, flow_colors)):
    x = start_x + i * (box_w + arrow_w + 0.15)
    box = add_rounded_rect(slide, x, y, box_w, box_h, clr)
    shape_text(box, label, 11, WHITE, True, PP_ALIGN.CENTER)
    if i < 4:
        ax = x + box_w + 0.02
        add_arrow(slide, ax, y + 0.3, arrow_w, 0.25)

# Three outputs
add_textbox(slide, 0.6, 2.55, 4, 0.4, "Three Outputs", 20, WHITE, True, PP_ALIGN.LEFT)

outputs = [
    ("Savings Report", "Item-by-item comparison across 6 retailers", GREEN),
    ("Smart Split", "Optimized multi-store shopping plan with route", PURPLE),
    ("Shopping List", "Store-organized checklist with directions", BLUE),
]
for i, (title, desc, clr) in enumerate(outputs):
    cx = 0.6 + i * 4.2
    card = add_rounded_rect(slide, cx, 3.0, 3.9, 1.2, CARD_BG)
    # Accent line at top of card
    add_rect(slide, cx, 3.0, 3.9, 0.05, clr)
    add_textbox(slide, cx + 0.2, 3.15, 3.5, 0.4, title, 16, WHITE, True, PP_ALIGN.LEFT)
    add_textbox(slide, cx + 0.2, 3.55, 3.5, 0.55, desc, 12, MUTED, False, PP_ALIGN.LEFT)

# Tech stack & AI tool
card_tech = add_rounded_rect(slide, 0.6, 4.5, 8.4, 1.3, CARD_BG)
shape_text(card_tech, "", 12, WHITE)
add_textbox(slide, 0.8, 4.6, 8.0, 0.35, "Tech Stack", 16, WHITE, True, PP_ALIGN.LEFT)
add_textbox(slide, 0.8, 4.95, 8.0, 0.35, "Next.js  |  Tesseract.js  |  Claude Vision API  |  Fuse.js  |  Kroger API", 13, MUTED, False, PP_ALIGN.LEFT)
add_textbox(slide, 0.8, 5.3, 8.0, 0.35, "AI Tool: Claude (Anthropic) -- full-stack code generation, architecture design, data pipeline, problem-solving", 12, LIGHT_PURPLE, False, PP_ALIGN.LEFT)

# Cost badge
cost_card = add_rounded_rect(slide, 9.4, 4.5, 3.3, 1.3, GREEN)
shape_text(cost_card, "", 12, WHITE)
add_textbox(slide, 9.5, 4.65, 3.1, 0.55, "Total Cost: $0", 26, WHITE, True, PP_ALIGN.CENTER)
add_textbox(slide, 9.5, 5.2, 3.1, 0.4, "All free and open-source tools", 12, WHITE, False, PP_ALIGN.CENTER)

add_rect(slide, 0, 7.44, 13.333, 0.06, PURPLE)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 4: Live Demo
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 1, 1.5, 11.333, 1.0, "Live Demonstration", 54, WHITE, True, PP_ALIGN.CENTER)
add_green_line(slide, 5.5, 2.5, 2.333)
add_textbox(slide, 1, 2.75, 11.333, 0.6, "GrocerScan in action", 22, MUTED, False, PP_ALIGN.CENTER)

# Talking points in a subtle card
card = add_rounded_rect(slide, 3.5, 3.7, 6.333, 2.8, CARD_BG)
shape_text(card, "", 14, WHITE)

tb = add_textbox(slide, 3.8, 3.85, 5.7, 2.5, "", 15, MUTED)
tf = tb.text_frame
points = [
    "1.  Upload and analyze a grocery receipt",
    "2.  Savings Report -- item-by-item price comparison",
    "3.  Smart Split -- optimized multi-store plan with Google Maps route",
    "4.  Shopping List -- store-organized checklist",
]
tf.paragraphs[0].text = points[0]
tf.paragraphs[0].font.size = Pt(15)
tf.paragraphs[0].font.color.rgb = MUTED
tf.paragraphs[0].font.name = "Calibri"
for pt in points[1:]:
    add_para(tf, pt, 15, MUTED, space_before=8, space_after=4)

add_rect(slide, 0, 7.44, 13.333, 0.06, GREEN)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 5: Business Value
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.3, 6, 0.7, "Business Value", 36, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.95, 2.0)

stats = [
    ("Under 30 sec", "Receipt analysis time", GREEN),
    ("$1,200-$2,400", "Annual savings per household", GREEN),
    ("85%+", "OCR extraction accuracy", PURPLE),
    ("80%+", "Fuzzy matching accuracy", PURPLE),
    ("6 retailers", "Price comparison coverage", BLUE),
    ("$0 cost", "All free tools", GREEN),
]

for i, (big, desc, clr) in enumerate(stats):
    col = i % 3
    row = i // 3
    cx = 0.6 + col * 4.15
    cy = 1.3 + row * 2.2
    card = add_rounded_rect(slide, cx, cy, 3.85, 1.9, CARD_BG)
    # Color accent bar on left side of card
    add_rect(slide, cx, cy, 0.07, 1.9, clr)
    add_textbox(slide, cx + 0.3, cy + 0.25, 3.3, 0.8, big, 32, WHITE, True, PP_ALIGN.CENTER)
    add_textbox(slide, cx + 0.3, cy + 1.1, 3.3, 0.5, desc, 14, MUTED, False, PP_ALIGN.CENTER)

# Privacy note at bottom
add_textbox(slide, 0.6, 6.1, 12.1, 0.5,
            "Privacy-first: OCR runs in-browser. Receipt images never leave the device.",
            14, MUTED, False, PP_ALIGN.CENTER)

add_rect(slide, 0, 7.44, 13.333, 0.06, PURPLE)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 6: Project Charter Summary
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.3, 8, 0.7, "Project Charter Summary", 36, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.95, 2.5)

# Three cards side by side
card_w = 3.85
card_h = 5.4
gap = 0.3
start_x = 0.6
start_y = 1.3

# Objectives card
c1 = add_rounded_rect(slide, start_x, start_y, card_w, card_h, CARD_BG)
add_rect(slide, start_x, start_y, card_w, 0.05, GREEN)
shape_text(c1, "", 12, WHITE)
add_textbox(slide, start_x + 0.2, start_y + 0.15, card_w - 0.4, 0.4, "Objectives", 20, LIGHT_GREEN, True, PP_ALIGN.LEFT)

tb = add_textbox(slide, start_x + 0.2, start_y + 0.65, card_w - 0.4, 4.5, "", 12, WHITE)
tf = tb.text_frame
obj_points = [
    "Functional prototype with 85%+ OCR accuracy",
    "Price database across 6 retailers with verified sources",
    "Three user-facing outputs from single receipt upload",
    "80%+ fuzzy matching accuracy on receipt abbreviations",
]
tf.paragraphs[0].text = chr(9654) + "  " + obj_points[0]
tf.paragraphs[0].font.size = Pt(12)
tf.paragraphs[0].font.color.rgb = WHITE
tf.paragraphs[0].font.name = "Calibri"
for pt in obj_points[1:]:
    add_para(tf, chr(9654) + "  " + pt, 12, WHITE, space_before=6, space_after=2)

# Scope card
sx2 = start_x + card_w + gap
c2 = add_rounded_rect(slide, sx2, start_y, card_w, card_h, CARD_BG)
add_rect(slide, sx2, start_y, card_w, 0.05, PURPLE)
shape_text(c2, "", 12, WHITE)
add_textbox(slide, sx2 + 0.2, start_y + 0.15, card_w - 0.4, 0.4, "Scope", 20, LIGHT_PURPLE, True, PP_ALIGN.LEFT)

tb = add_textbox(slide, sx2 + 0.2, start_y + 0.65, card_w - 0.4, 4.5, "", 12, WHITE)
tf = tb.text_frame

tf.paragraphs[0].text = "IN SCOPE"
tf.paragraphs[0].font.size = Pt(13)
tf.paragraphs[0].font.bold = True
tf.paragraphs[0].font.color.rgb = LIGHT_GREEN
tf.paragraphs[0].font.name = "Calibri"

in_items = ["Receipt upload, OCR pipeline", "Price comparison, 3 outputs", "Web app, documentation"]
for it in in_items:
    add_para(tf, chr(9654) + "  " + it, 11, WHITE, space_before=3, space_after=1)

add_para(tf, "", 6, WHITE, space_before=4)
add_para(tf, "OUT OF SCOPE", 13, RED, True, space_before=2)
out_items = ["Real-time APIs for all stores", "User accounts, mobile app", "Geographic localization"]
for it in out_items:
    add_para(tf, chr(9654) + "  " + it, 11, MUTED, space_before=3, space_after=1)

# Key Deliverables card
sx3 = sx2 + card_w + gap
c3 = add_rounded_rect(slide, sx3, start_y, card_w, card_h, CARD_BG)
add_rect(slide, sx3, start_y, card_w, 0.05, BLUE)
shape_text(c3, "", 12, WHITE)
add_textbox(slide, sx3 + 0.2, start_y + 0.15, card_w - 0.4, 0.4, "Key Deliverables", 20, RGBColor(0x5D, 0xAE, 0xF0), True, PP_ALIGN.LEFT)

tb = add_textbox(slide, sx3 + 0.2, start_y + 0.65, card_w - 0.4, 4.5, "", 12, WHITE)
tf = tb.text_frame
del_points = [
    "Functional web application with 3 sample receipts",
    "OCR pipeline, matching engine, price database",
    "Charter, written report, presentation and demo",
]
tf.paragraphs[0].text = chr(9654) + "  " + del_points[0]
tf.paragraphs[0].font.size = Pt(12)
tf.paragraphs[0].font.color.rgb = WHITE
tf.paragraphs[0].font.name = "Calibri"
for pt in del_points[1:]:
    add_para(tf, chr(9654) + "  " + pt, 12, WHITE, space_before=6, space_after=2)

add_rect(slide, 0, 7.44, 13.333, 0.06, GREEN)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 7: Implementation Plan (Gantt + Scaling)
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.15, 8, 0.6, "Implementation Plan", 32, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.7, 2.0)

# Gantt chart area
gantt_left = 2.5
gantt_top = 0.95
col_w = 1.4
row_h = 0.42
label_w = 1.8

tasks = [
    ("Project Initiation",  0, 1, BLUE),
    ("Data Sourcing",        0, 2, GREEN),
    ("OCR Pipeline",         1, 3, PURPLE),
    ("Matching Engine",      2, 4, PURPLE),
    ("Web Application",      2, 5, PURPLE),
    ("Integration Testing",  3, 5, ORANGE),
    ("Documentation",        4, 6, ORANGE),
    ("Presentation",         5, 7, RED),
]

cols = ["Day 1\nAM", "Day 1\nPM", "Day 1\nEVE", "Day 2\nAM", "Day 2\nPM", "Day 2\nEVE", "Sunday"]

# Column headers
for i, col_label in enumerate(cols):
    x = gantt_left + i * col_w
    add_textbox(slide, x, gantt_top, col_w, 0.45, col_label, 9, MUTED, True, PP_ALIGN.CENTER)

# Grid lines (subtle)
for i in range(len(cols) + 1):
    x = gantt_left + i * col_w
    line = add_rect(slide, x, gantt_top + 0.45, 0.005, row_h * len(tasks), RGBColor(0x30, 0x30, 0x50))

# Task rows
for r, (name, start, end, clr) in enumerate(tasks):
    y = gantt_top + 0.5 + r * row_h
    # Label
    add_textbox(slide, 0.3, y, label_w, row_h, name, 10, WHITE, False, PP_ALIGN.RIGHT)
    # Bar
    bx = gantt_left + start * col_w + 0.05
    bw = (end - start) * col_w - 0.1
    bar = add_rounded_rect(slide, bx, y + 0.06, bw, row_h - 0.12, clr)
    try:
        bar.adjustments[0] = 0.15
    except:
        pass

# Legend (small, below gantt)
legend_y = gantt_top + 0.5 + len(tasks) * row_h + 0.15
legend_items = [("Planning", BLUE), ("Data", GREEN), ("Development", PURPLE), ("Documentation", ORANGE), ("Presentation", RED)]
for i, (lbl, clr) in enumerate(legend_items):
    lx = gantt_left + i * 2.0
    add_rect(slide, lx, legend_y, 0.2, 0.15, clr)
    add_textbox(slide, lx + 0.25, legend_y - 0.03, 1.5, 0.2, lbl, 9, MUTED, False, PP_ALIGN.LEFT)

# Scaling Strategy section - bottom half
scale_y = 4.85
add_textbox(slide, 0.6, scale_y, 5, 0.4, "Scaling Strategy", 22, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, scale_y + 0.4, 1.5)

scale_points = [
    "Deploy on Vercel (free tier) for immediate public access",
    "Pursue retailer API partnerships for real-time pricing",
    "Expand product catalog from demo set to full SKU coverage",
]
card = add_rounded_rect(slide, 0.6, scale_y + 0.55, 12.1, 1.7, CARD_BG)
shape_text(card, "", 12, WHITE)

tb = add_textbox(slide, 0.9, scale_y + 0.65, 11.5, 1.5, "", 14, WHITE)
tf = tb.text_frame
tf.paragraphs[0].text = chr(9654) + "  " + scale_points[0]
tf.paragraphs[0].font.size = Pt(14)
tf.paragraphs[0].font.color.rgb = WHITE
tf.paragraphs[0].font.name = "Calibri"
for sp in scale_points[1:]:
    add_para(tf, chr(9654) + "  " + sp, 14, WHITE, space_before=6, space_after=2)

add_rect(slide, 0, 7.44, 13.333, 0.06, PURPLE)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 8: Risks and Limitations
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.3, 8, 0.7, "Risks and Limitations", 36, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.95, 2.0)

risks = [
    ("Walmart blocks automated scraping",
     "Pivoted to NPR price surveys, BLS CPI data, published pricing guides"),
    ("OCR accuracy on faded/damaged receipts",
     "Image preprocessing (adaptive thresholding) + Claude Vision API fallback"),
    ("Receipt abbreviation matching failures",
     "Built 150+ item abbreviation lookup table + tuned fuzzy matching thresholds"),
]

for i, (risk, mitigation) in enumerate(risks):
    cx = 0.6 + i * 4.15
    card = add_rounded_rect(slide, cx, 1.3, 3.85, 3.0, CARD_BG)
    add_rect(slide, cx, 1.3, 3.85, 0.05, RED)
    shape_text(card, "", 12, WHITE)
    
    add_textbox(slide, cx + 0.2, 1.45, 3.45, 0.3, "RISK", 12, RED, True, PP_ALIGN.LEFT)
    add_textbox(slide, cx + 0.2, 1.75, 3.45, 0.8, risk, 13, WHITE, False, PP_ALIGN.LEFT)
    
    add_textbox(slide, cx + 0.2, 2.65, 3.45, 0.3, "MITIGATION", 12, LIGHT_GREEN, True, PP_ALIGN.LEFT)
    add_textbox(slide, cx + 0.2, 2.95, 3.45, 1.1, mitigation, 12, MUTED, False, PP_ALIGN.LEFT)

# Limitations section
lim_y = 4.65
add_textbox(slide, 0.6, lim_y, 4, 0.4, "Known Limitations", 20, WHITE, True, PP_ALIGN.LEFT)

card = add_rounded_rect(slide, 0.6, lim_y + 0.45, 12.1, 1.6, CARD_BG)
add_rect(slide, 0.6, lim_y + 0.45, 12.1, 0.05, ORANGE)
shape_text(card, "", 12, WHITE)

limitations = [
    "Static price database (not real-time) -- prices are point-in-time snapshots",
    "Geographic variation not modeled beyond demo dataset",
    "Coupons and loyalty discounts not factored in",
]
tb = add_textbox(slide, 0.9, lim_y + 0.65, 11.5, 1.3, "", 13, MUTED)
tf = tb.text_frame
tf.paragraphs[0].text = chr(9654) + "  " + limitations[0]
tf.paragraphs[0].font.size = Pt(13)
tf.paragraphs[0].font.color.rgb = MUTED
tf.paragraphs[0].font.name = "Calibri"
for lim in limitations[1:]:
    add_para(tf, chr(9654) + "  " + lim, 13, MUTED, space_before=5, space_after=2)

add_rect(slide, 0, 7.44, 13.333, 0.06, RED)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 9: Conclusion and Recommendation
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_textbox(slide, 0.6, 0.3, 8, 0.7, "Conclusion", 36, WHITE, True, PP_ALIGN.LEFT)
add_green_line(slide, 0.6, 0.95, 1.8)

# Key takeaway card
card = add_rounded_rect(slide, 0.6, 1.3, 12.1, 1.6, CARD_BG)
add_rect(slide, 0.6, 1.3, 0.07, 1.6, GREEN)
shape_text(card, "", 12, WHITE)

add_textbox(slide, 1.0, 1.45, 11.4, 1.3,
            "GrocerScan validates that AI-powered receipt scanning and cross-retailer "
            "price comparison is technically feasible, delivers measurable consumer value, "
            "and can be built at zero cost using free tools.",
            18, WHITE, False, PP_ALIGN.LEFT)

# Recommendation section
add_textbox(slide, 0.6, 3.2, 6, 0.5, "Recommendation: Proceed to Phase 2", 26, LIGHT_GREEN, True, PP_ALIGN.LEFT)

rec_items = [
    ("Secure retailer API partnerships", "for real-time pricing data", GREEN),
    ("Launch geographic price localization", "ZIP code-level price accuracy", PURPLE),
    ("Pursue freemium model", "Free basic scans, $4.99/month premium", BLUE),
    ("Target: 50K premium subscribers", "= $3M ARR", GREEN),
]

for i, (title, desc, clr) in enumerate(rec_items):
    col = i % 2
    row = i // 2
    cx = 0.6 + col * 6.25
    cy = 3.85 + row * 1.45
    card = add_rounded_rect(slide, cx, cy, 5.95, 1.2, CARD_BG)
    add_rect(slide, cx, cy, 0.07, 1.2, clr)
    shape_text(card, "", 12, WHITE)
    add_textbox(slide, cx + 0.3, cy + 0.15, 5.4, 0.45, title, 16, WHITE, True, PP_ALIGN.LEFT)
    add_textbox(slide, cx + 0.3, cy + 0.6, 5.4, 0.4, desc, 13, MUTED, False, PP_ALIGN.LEFT)

add_rect(slide, 0, 7.44, 13.333, 0.06, GREEN)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 10: Q&A
# ════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
set_bg(slide)

add_rect(slide, 0, 0, 13.333, 0.06, GREEN)

add_textbox(slide, 1, 1.8, 11.333, 1.5, "Questions?", 64, WHITE, True, PP_ALIGN.CENTER)
add_green_line(slide, 5.5, 3.3, 2.333)

add_textbox(slide, 1, 3.7, 11.333, 0.6,
            "Eduardo Salvador  |  Pragya Kunwar  |  Hellen Nyokusi  |  Srawan Bhatt",
            18, WHITE, False, PP_ALIGN.CENTER)

add_textbox(slide, 1, 4.7, 11.333, 0.5,
            "Thank you",
            24, MUTED, False, PP_ALIGN.CENTER)

add_textbox(slide, 1, 5.6, 11.333, 0.4,
            "BUPM-634-M20  |  Spring 2026",
            14, MUTED, False, PP_ALIGN.CENTER)

add_rect(slide, 0, 7.44, 13.333, 0.06, PURPLE)


# ════════════════════════════════════════════════════════════════════════════
# Save
# ════════════════════════════════════════════════════════════════════════════
output_path = "/Users/eduardosalvador/clawd/projects/bidbench-web/GrocerScan-Presentation.pptx"
prs.save(output_path)
print(f"Saved to {output_path}")
print(f"Total slides: {len(prs.slides)}")
