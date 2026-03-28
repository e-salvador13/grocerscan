#!/usr/bin/env python3
"""Generate GrocerScan Professional PowerPoint Presentation."""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# ── Constants ──────────────────────────────────────────────────────────
NAVY = RGBColor(0x1A, 0x1A, 0x2E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x0D, 0x63, 0x1B)
PURPLE = RGBColor(0x4C, 0x56, 0xAF)
LIGHT_GRAY = RGBColor(0xAA, 0xAA, 0xBB)
MUTED = RGBColor(0x88, 0x88, 0x99)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
ORANGE = RGBColor(0xF5, 0x9E, 0x0B)
RED = RGBColor(0xEF, 0x44, 0x44)
DARK_CARD = RGBColor(0x25, 0x25, 0x40)
DARKER_CARD = RGBColor(0x20, 0x20, 0x38)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
FONT = "Calibri"

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H


# ── Helpers ────────────────────────────────────────────────────────────
def get_blank_layout():
    """Return blank slide layout."""
    for layout in prs.slide_layouts:
        if layout.name == "Blank":
            return layout
    return prs.slide_layouts[6]


def add_slide():
    """Add a blank slide with dark navy background."""
    slide = prs.slides.add_slide(get_blank_layout())
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = NAVY
    return slide


def add_text_box(slide, left, top, width, height, text, font_size=20,
                 color=WHITE, bold=False, alignment=PP_ALIGN.LEFT,
                 font_name=FONT, anchor=MSO_ANCHOR.TOP):
    """Add a text box with a single run."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf.vertical_anchor = anchor
    except:
        pass
    p = tf.paragraphs[0]
    p.alignment = alignment
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = font_name
    return txBox


def add_title(slide, text, top=Inches(0.4)):
    """Add slide title."""
    add_text_box(slide, Inches(0.8), top, Inches(11.5), Inches(0.8),
                 text, font_size=40, bold=True, color=WHITE)


def add_subtitle_line(slide, top):
    """Add a thin accent line below title."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0.8), top, Inches(2), Pt(3))
    shape.fill.solid()
    shape.fill.fore_color.rgb = GREEN
    shape.line.fill.background()
    return shape


def add_bullet_list(slide, left, top, width, height, items, font_size=22,
                    color=WHITE, spacing=Pt(8)):
    """Add a bullet-point list."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.space_after = spacing
        p.alignment = PP_ALIGN.LEFT
        run = p.add_run()
        run.text = f"▸  {item}"
        run.font.size = Pt(font_size)
        run.font.color.rgb = color
        run.font.name = FONT
    return txBox


def add_card(slide, left, top, width, height, fill_color=DARK_CARD,
             border_color=None, corner_radius=Inches(0.15)):
    """Add a rounded rectangle card shape."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)
    else:
        shape.line.fill.background()
    return shape


def add_arrow_right(slide, left, top, width=Inches(0.5), height=Inches(0.3)):
    """Add a right-pointing arrow."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RIGHT_ARROW, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = GREEN
    shape.line.fill.background()
    return shape


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 1 — Title
# ═══════════════════════════════════════════════════════════════════════
def slide_title():
    slide = add_slide()

    # Decorative top bar
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_W, Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GREEN
    bar.line.fill.background()

    # Main title
    add_text_box(slide, Inches(1), Inches(1.5), Inches(11.3), Inches(1.2),
                 "GrocerScan", font_size=60, bold=True, color=WHITE,
                 alignment=PP_ALIGN.CENTER)

    # Subtitle
    add_text_box(slide, Inches(1), Inches(2.7), Inches(11.3), Inches(0.6),
                 "AI-Driven Grocery Receipt Price Comparison Platform",
                 font_size=26, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

    # Accent line
    line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(5.2), Inches(3.5), Inches(3), Pt(3))
    line.fill.solid()
    line.fill.fore_color.rgb = GREEN
    line.line.fill.background()

    # Residency project
    add_text_box(slide, Inches(1), Inches(3.8), Inches(11.3), Inches(0.5),
                 "Residency Project #2", font_size=22, color=PURPLE,
                 bold=True, alignment=PP_ALIGN.CENTER)

    # Team
    add_text_box(slide, Inches(1), Inches(4.6), Inches(11.3), Inches(0.5),
                 "Eduardo Salvador  ·  Pragya Kunwar  ·  Hellen Nyokusi  ·  Srawan Bhatt",
                 font_size=20, color=WHITE, alignment=PP_ALIGN.CENTER)

    # Course info
    add_text_box(slide, Inches(1), Inches(5.3), Inches(11.3), Inches(0.5),
                 "BUPM-634-M20  ·  Initiating the Project  ·  Spring 2026",
                 font_size=16, color=MUTED, alignment=PP_ALIGN.CENTER)

    add_text_box(slide, Inches(1), Inches(5.8), Inches(11.3), Inches(0.4),
                 "Professor Daniel Kanyam",
                 font_size=16, color=MUTED, alignment=PP_ALIGN.CENTER)

    # Bottom bar
    bar2 = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.44), SLIDE_W, Inches(0.06))
    bar2.fill.solid()
    bar2.fill.fore_color.rgb = PURPLE
    bar2.line.fill.background()


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 2 — The Problem
# ═══════════════════════════════════════════════════════════════════════
def slide_problem():
    slide = add_slide()
    add_title(slide, "The Problem")
    add_subtitle_line(slide, Inches(1.1))

    # Big stat card
    card = add_card(slide, Inches(0.8), Inches(1.5), Inches(4.5), Inches(1.8),
                    fill_color=DARKER_CARD, border_color=GREEN)
    add_text_box(slide, Inches(1.0), Inches(1.6), Inches(4.1), Inches(1.0),
                 "$270/week", font_size=54, bold=True, color=GREEN,
                 alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(1.0), Inches(2.6), Inches(4.1), Inches(0.5),
                 "Average U.S. household grocery spend",
                 font_size=16, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

    # Bullet points
    bullets = [
        "Prices vary 15–40% across stores for identical items",
        "No efficient tool for item-level price comparison",
        "25% grocery inflation from 2020–2024",
        "Estimated overspending: $1,200–$2,400 per household/year",
        "Existing solutions are fragmented (store apps, coupon aggregators)",
    ]
    add_bullet_list(slide, Inches(5.8), Inches(1.6), Inches(6.8), Inches(5.0),
                    bullets, font_size=21)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 3 — Our Solution
# ═══════════════════════════════════════════════════════════════════════
def slide_solution():
    slide = add_slide()
    add_title(slide, "GrocerScan")
    add_subtitle_line(slide, Inches(1.1))

    add_text_box(slide, Inches(0.8), Inches(1.4), Inches(11.5), Inches(0.5),
                 "Upload a receipt. See where you overpaid. Save money.",
                 font_size=24, color=LIGHT_GRAY)

    # Three feature cards
    features = [
        ("Savings Report", "Item-by-item price comparison\nacross 6 stores", GREEN),
        ("Smart Split", "Optimized multi-store\nshopping plan with route", PURPLE),
        ("Shopping List", "Store-organized checklist\nwith directions", BLUE),
    ]
    icons = ["📊", "✂️", "🛒"]

    card_w = Inches(3.6)
    card_h = Inches(3.0)
    gap = Inches(0.5)
    start_x = Inches(0.8)
    card_y = Inches(2.3)

    for i, (title, desc, accent) in enumerate(features):
        x = start_x + i * (card_w + gap)
        card = add_card(slide, x, card_y, card_w, card_h,
                        fill_color=DARKER_CARD, border_color=accent)

        # Accent bar at top of card
        bar = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, x, card_y, card_w, Pt(4))
        bar.fill.solid()
        bar.fill.fore_color.rgb = accent
        bar.line.fill.background()

        # Icon + Title
        add_text_box(slide, x + Inches(0.3), card_y + Inches(0.3),
                     card_w - Inches(0.6), Inches(0.6),
                     f"{icons[i]}  {title}", font_size=24, bold=True, color=WHITE)

        # Description
        add_text_box(slide, x + Inches(0.3), card_y + Inches(1.1),
                     card_w - Inches(0.6), Inches(1.5),
                     desc, font_size=18, color=LIGHT_GRAY)

    # Privacy note
    add_text_box(slide, Inches(0.8), Inches(5.8), Inches(11.5), Inches(0.5),
                 "🔒 Privacy-first: OCR runs in-browser. Receipt images never leave your device.",
                 font_size=16, color=MUTED, alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 4 — How It Works
# ═══════════════════════════════════════════════════════════════════════
def slide_how_it_works():
    slide = add_slide()
    add_title(slide, "How It Works")
    add_subtitle_line(slide, Inches(1.1))

    steps = [
        ("📸", "Receipt\nPhoto", "Upload", PURPLE),
        ("🔍", "OCR\nExtraction", "Tesseract.js", GREEN),
        ("🔗", "Fuzzy\nMatching", "Fuse.js", BLUE),
        ("💰", "Price\nAnalysis", "6-store DB", ORANGE),
        ("📋", "Results", "Report · Split · List", GREEN),
    ]

    box_w = Inches(1.9)
    box_h = Inches(2.8)
    arrow_w = Inches(0.45)
    total_content = 5 * box_w + 4 * arrow_w
    start_x_val = (Inches(13.333) - total_content) / 2
    y = Inches(2.5)

    for i, (icon, title, sub, color) in enumerate(steps):
        x = start_x_val + i * (box_w + arrow_w)

        # Card
        card = add_card(slide, x, y, box_w, box_h, fill_color=DARKER_CARD,
                        border_color=color)

        # Top accent
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, box_w, Pt(4))
        bar.fill.solid()
        bar.fill.fore_color.rgb = color
        bar.line.fill.background()

        # Icon
        add_text_box(slide, x, y + Inches(0.3), box_w, Inches(0.6),
                     icon, font_size=36, alignment=PP_ALIGN.CENTER)

        # Title
        add_text_box(slide, x + Inches(0.1), y + Inches(1.0),
                     box_w - Inches(0.2), Inches(0.9),
                     title, font_size=20, bold=True, color=WHITE,
                     alignment=PP_ALIGN.CENTER)

        # Subtitle
        add_text_box(slide, x + Inches(0.1), y + Inches(2.0),
                     box_w - Inches(0.2), Inches(0.5),
                     sub, font_size=14, color=MUTED,
                     alignment=PP_ALIGN.CENTER)

        # Arrow (except after last)
        if i < 4:
            arrow_x = x + box_w + Inches(0.02)
            add_arrow_right(slide, arrow_x, y + Inches(1.2),
                            width=Inches(0.4), height=Inches(0.35))


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 5 — Technology Stack
# ═══════════════════════════════════════════════════════════════════════
def slide_tech_stack():
    slide = add_slide()
    add_title(slide, "Technology Stack")
    add_subtitle_line(slide, Inches(1.1))

    # Left column card
    left_x = Inches(0.8)
    col_y = Inches(1.6)
    col_w = Inches(5.6)
    col_h = Inches(4.2)

    add_card(slide, left_x, col_y, col_w, col_h, fill_color=DARKER_CARD,
             border_color=PURPLE)
    add_text_box(slide, left_x + Inches(0.3), col_y + Inches(0.2),
                 col_w - Inches(0.6), Inches(0.5),
                 "Frontend & Processing", font_size=22, bold=True, color=PURPLE)

    left_items = [
        "Next.js + React + Tailwind CSS",
        "Tesseract.js (client-side OCR)",
        "Claude Vision API (OCR fallback)",
        "Fuse.js (fuzzy text matching)",
    ]
    add_bullet_list(slide, left_x + Inches(0.3), col_y + Inches(0.9),
                    col_w - Inches(0.6), Inches(3.0), left_items, font_size=20)

    # Right column card
    right_x = Inches(6.9)
    add_card(slide, right_x, col_y, col_w, col_h, fill_color=DARKER_CARD,
             border_color=GREEN)
    add_text_box(slide, right_x + Inches(0.3), col_y + Inches(0.2),
                 col_w - Inches(0.6), Inches(0.5),
                 "Data & Infrastructure", font_size=22, bold=True, color=GREEN)

    right_items = [
        "Kroger Product API (direct pricing)",
        "Published price surveys (NPR, BLS)",
        "6 retailers: Walmart, Kroger, Target,\n   Whole Foods, Aldi, Lidl",
        "Vercel free tier (hosting)",
    ]
    add_bullet_list(slide, right_x + Inches(0.3), col_y + Inches(0.9),
                    col_w - Inches(0.6), Inches(3.0), right_items, font_size=20)

    # Bottom banner
    banner = add_card(slide, Inches(0.8), Inches(6.2), Inches(11.7), Inches(0.7),
                      fill_color=DARKER_CARD, border_color=GREEN)
    add_text_box(slide, Inches(0.8), Inches(6.25), Inches(11.7), Inches(0.6),
                 "Total Cost: $0 — All free and open-source tools",
                 font_size=22, bold=True, color=GREEN, alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 6 — AI Tool Usage
# ═══════════════════════════════════════════════════════════════════════
def slide_ai_tools():
    slide = add_slide()
    add_title(slide, "AI-Powered Development")
    add_subtitle_line(slide, Inches(1.1))

    # Main AI card - Claude
    card_x = Inches(0.8)
    card_y = Inches(1.6)
    card_w = Inches(7.0)
    card_h = Inches(4.5)
    add_card(slide, card_x, card_y, card_w, card_h, fill_color=DARKER_CARD,
             border_color=PURPLE)

    add_text_box(slide, card_x + Inches(0.3), card_y + Inches(0.2),
                 card_w - Inches(0.6), Inches(0.5),
                 "Claude (Anthropic) — Primary AI Tool",
                 font_size=24, bold=True, color=PURPLE)

    claude_items = [
        "Full-stack code generation",
        "Architecture and data pipeline design",
        "Problem-solving (Walmart scraping workaround)",
        "Documentation assistance",
    ]
    add_bullet_list(slide, card_x + Inches(0.3), card_y + Inches(1.0),
                    card_w - Inches(0.6), Inches(3.0), claude_items, font_size=20)

    # Side cards
    side_x = Inches(8.3)
    side_w = Inches(4.2)

    # Tesseract card
    add_card(slide, side_x, card_y, side_w, Inches(2.0), fill_color=DARKER_CARD,
             border_color=GREEN)
    add_text_box(slide, side_x + Inches(0.3), card_y + Inches(0.2),
                 side_w - Inches(0.6), Inches(0.5),
                 "Tesseract.js", font_size=22, bold=True, color=GREEN)
    add_text_box(slide, side_x + Inches(0.3), card_y + Inches(0.8),
                 side_w - Inches(0.6), Inches(0.8),
                 "Open-source OCR engine\nRuns entirely in-browser",
                 font_size=18, color=LIGHT_GRAY)

    # Claude Vision card
    cv_y = card_y + Inches(2.3)
    add_card(slide, side_x, cv_y, side_w, Inches(2.0), fill_color=DARKER_CARD,
             border_color=BLUE)
    add_text_box(slide, side_x + Inches(0.3), cv_y + Inches(0.2),
                 side_w - Inches(0.6), Inches(0.5),
                 "Claude Vision API", font_size=22, bold=True, color=BLUE)
    add_text_box(slide, side_x + Inches(0.3), cv_y + Inches(0.8),
                 side_w - Inches(0.6), Inches(0.8),
                 "Fallback receipt extraction\nHandles faded/damaged receipts",
                 font_size=18, color=LIGHT_GRAY)

    # Bottom note
    add_text_box(slide, Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.5),
                 "Claude accelerated development across all project phases",
                 font_size=16, color=MUTED, alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 7 — Gantt Chart
# ═══════════════════════════════════════════════════════════════════════
def slide_gantt():
    slide = add_slide()
    add_title(slide, "Project Timeline")
    add_subtitle_line(slide, Inches(1.1))

    # Gantt chart area
    chart_left = Inches(3.2)
    chart_top = Inches(1.7)
    chart_right = Inches(12.5)
    chart_width = chart_right - chart_left
    row_h = Inches(0.52)
    label_x = Inches(0.5)

    tasks = [
        "Project Initiation",
        "Data Sourcing & Database",
        "OCR Pipeline",
        "Fuzzy Matching Engine",
        "Web Application UI",
        "Integration Testing",
        "Documentation",
        "Presentation & Demo",
    ]

    # Time columns: Day1AM=0, Day1PM=1, Day1EVE=2, Day2AM=3, Day2PM=4, Day2EVE=5, Sunday=6
    time_labels = ["Day 1\nAM", "Day 1\nPM", "Day 1\nEVE", "Day 2\nAM",
                   "Day 2\nPM", "Day 2\nEVE", "Sunday"]
    col_width = chart_width / 7

    # Column headers
    for i, label in enumerate(time_labels):
        x = chart_left + i * col_width
        add_text_box(slide, x, chart_top - Inches(0.55), col_width, Inches(0.5),
                     label, font_size=11, color=MUTED, alignment=PP_ALIGN.CENTER)

        # Vertical gridline
        if i > 0:
            line = slide.shapes.add_shape(
                MSO_SHAPE.RECTANGLE, x, chart_top, Pt(1),
                row_h * len(tasks))
            line.fill.solid()
            line.fill.fore_color.rgb = RGBColor(0x30, 0x30, 0x48)
            line.line.fill.background()

    # Task bars: (start_col, end_col, color)
    bar_data = [
        (0, 0, BLUE),       # Project Initiation
        (0, 1, GREEN),      # Data Sourcing
        (1, 2, PURPLE),     # OCR Pipeline
        (2, 3, PURPLE),     # Fuzzy Matching
        (2, 4, PURPLE),     # Web Application
        (3, 4, BLUE),       # Integration Testing
        (4, 5, ORANGE),     # Documentation
        (5, 6, RED),        # Presentation
    ]

    for i, task in enumerate(tasks):
        y = chart_top + i * row_h

        # Row label
        add_text_box(slide, label_x, y, Inches(2.6), row_h,
                     task, font_size=14, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)

        # Alternating row background
        if i % 2 == 0:
            row_bg = slide.shapes.add_shape(
                MSO_SHAPE.RECTANGLE, chart_left, y, chart_width, row_h)
            row_bg.fill.solid()
            row_bg.fill.fore_color.rgb = RGBColor(0x1E, 0x1E, 0x34)
            row_bg.line.fill.background()

        # Bar
        start_col, end_col, color = bar_data[i]
        bar_x = chart_left + start_col * col_width + Pt(4)
        bar_w = (end_col - start_col + 1) * col_width - Pt(8)
        bar_y = y + Inches(0.08)
        bar_h = row_h - Inches(0.16)

        bar = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, bar_x, bar_y, bar_w, bar_h)
        bar.fill.solid()
        bar.fill.fore_color.rgb = color
        bar.line.fill.background()

        # Bar label
        add_text_box(slide, bar_x, bar_y, bar_w, bar_h,
                     task, font_size=11, color=WHITE, bold=True,
                     alignment=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

    # Legend
    legend_y = chart_top + len(tasks) * row_h + Inches(0.4)
    legend_items = [
        ("Planning", BLUE), ("Data", GREEN), ("Development", PURPLE),
        ("Documentation", ORANGE), ("Presentation", RED),
    ]
    legend_x = Inches(3.2)
    for j, (lbl, clr) in enumerate(legend_items):
        x = legend_x + j * Inches(1.9)
        dot = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, x, legend_y + Pt(3), Pt(12), Pt(12))
        dot.fill.solid()
        dot.fill.fore_color.rgb = clr
        dot.line.fill.background()
        add_text_box(slide, x + Pt(18), legend_y, Inches(1.5), Inches(0.3),
                     lbl, font_size=12, color=MUTED)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 8 — Savings Report
# ═══════════════════════════════════════════════════════════════════════
def slide_savings_report():
    slide = add_slide()
    add_title(slide, "Savings Report")
    add_subtitle_line(slide, Inches(1.1))

    # Icon/accent
    add_text_box(slide, Inches(0.8), Inches(1.5), Inches(1), Inches(0.6),
                 "📊", font_size=36)

    bullets = [
        "Item-by-item price comparison across 6 retailers",
        "Color-coded status: overcharged, deal, or fair price",
        "Expandable category breakdown (Produce, Dairy, Meat, etc.)",
        "Click any item to see prices at all 6 stores",
        "Downloadable PDF report",
    ]
    add_bullet_list(slide, Inches(0.8), Inches(2.3), Inches(11.0), Inches(3.5),
                    bullets, font_size=22)

    # Demo note card
    note_card = add_card(slide, Inches(0.8), Inches(5.5), Inches(11.7), Inches(0.8),
                         fill_color=DARKER_CARD, border_color=GREEN)
    add_text_box(slide, Inches(0.8), Inches(5.55), Inches(11.7), Inches(0.7),
                 "▶  We'll see this in the live demo",
                 font_size=20, bold=True, color=GREEN, alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 9 — Smart Split
# ═══════════════════════════════════════════════════════════════════════
def slide_smart_split():
    slide = add_slide()
    add_title(slide, "Smart Split Optimizer")
    add_subtitle_line(slide, Inches(1.1))

    add_text_box(slide, Inches(0.8), Inches(1.5), Inches(1), Inches(0.6),
                 "✂️", font_size=36)

    bullets = [
        "Distributes grocery list across 2–3 stores for maximum savings",
        "Route overview with Google Maps integration",
        "Item comparison table with store filter chips",
        "Efficiency score and savings alerts",
        "One-click navigation to optimized route",
    ]
    add_bullet_list(slide, Inches(0.8), Inches(2.3), Inches(11.0), Inches(3.5),
                    bullets, font_size=22)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 10 — Shopping List
# ═══════════════════════════════════════════════════════════════════════
def slide_shopping_list():
    slide = add_slide()
    add_title(slide, "Smart Shopping List")
    add_subtitle_line(slide, Inches(1.1))

    add_text_box(slide, Inches(0.8), Inches(1.5), Inches(1), Inches(0.6),
                 "🛒", font_size=36)

    bullets = [
        "Store-organized interactive checklist",
        "Check off items as you shop",
        "Get Directions button for each store",
        "Savings strategy breakdown",
        "Share list (copy to clipboard)",
    ]
    add_bullet_list(slide, Inches(0.8), Inches(2.3), Inches(11.0), Inches(3.5),
                    bullets, font_size=22)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 11 — Live Demo
# ═══════════════════════════════════════════════════════════════════════
def slide_live_demo():
    slide = add_slide()

    # Big centered title
    add_text_box(slide, Inches(0), Inches(1.5), SLIDE_W, Inches(1.5),
                 "Live Demo", font_size=60, bold=True, color=WHITE,
                 alignment=PP_ALIGN.CENTER)

    add_text_box(slide, Inches(0), Inches(3.0), SLIDE_W, Inches(0.6),
                 "GrocerScan in action", font_size=26, color=GREEN,
                 alignment=PP_ALIGN.CENTER)

    # Accent line
    line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(5.5), Inches(3.8), Inches(2.3), Pt(3))
    line.fill.solid()
    line.fill.fore_color.rgb = GREEN
    line.line.fill.background()

    # Talking points (small, muted)
    points = [
        "1.  Landing page & sample receipt selection",
        "2.  Savings Report walkthrough",
        "3.  Smart Split with route overview",
        "4.  Shopping List features",
        "5.  Upload a real receipt",
    ]
    txBox = slide.shapes.add_textbox(Inches(4.0), Inches(4.3), Inches(5.5), Inches(2.5))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, pt in enumerate(points):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(6)
        p.alignment = PP_ALIGN.LEFT
        run = p.add_run()
        run.text = pt
        run.font.size = Pt(16)
        run.font.color.rgb = MUTED
        run.font.name = FONT


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 12 — Results & Impact
# ═══════════════════════════════════════════════════════════════════════
def slide_results():
    slide = add_slide()
    add_title(slide, "Results & Impact")
    add_subtitle_line(slide, Inches(1.1))

    stats = [
        ("<30 sec", "Receipt analysis time"),
        ("$1,200–$2,400", "Annual savings potential"),
        ("≥85%", "OCR extraction accuracy"),
        ("≥80%", "Fuzzy matching accuracy"),
        ("6 retailers", "Price comparison coverage"),
        ("$0", "Total development cost"),
    ]

    card_w = Inches(3.6)
    card_h = Inches(2.2)
    gap_x = Inches(0.45)
    gap_y = Inches(0.35)
    start_x = Inches(0.8)
    start_y = Inches(1.6)
    cols = 3

    for i, (stat, label) in enumerate(stats):
        col = i % cols
        row = i // cols
        x = start_x + col * (card_w + gap_x)
        y = start_y + row * (card_h + gap_y)

        add_card(slide, x, y, card_w, card_h, fill_color=DARKER_CARD,
                 border_color=GREEN)

        # Big number
        add_text_box(slide, x, y + Inches(0.25), card_w, Inches(1.0),
                     stat, font_size=42, bold=True, color=GREEN,
                     alignment=PP_ALIGN.CENTER)

        # Label
        add_text_box(slide, x, y + Inches(1.3), card_w, Inches(0.6),
                     label, font_size=16, color=LIGHT_GRAY,
                     alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 13 — Challenges
# ═══════════════════════════════════════════════════════════════════════
def slide_challenges():
    slide = add_slide()
    add_title(slide, "Challenges & Lessons Learned")
    add_subtitle_line(slide, Inches(1.1))

    challenges = [
        ("Walmart blocks scraping",
         "Pivoted to NPR surveys, BLS CPI data, published price guides",
         RED),
        ("OCR accuracy on faded receipts",
         "Image preprocessing + Claude Vision API as intelligent fallback",
         ORANGE),
        ("Receipt abbreviation matching",
         "Built 150+ item abbreviation lookup table for fuzzy matching",
         PURPLE),
    ]

    card_w = Inches(3.7)
    card_h = Inches(4.0)
    gap = Inches(0.4)
    start_x = Inches(0.8)
    y = Inches(1.6)

    for i, (challenge, mitigation, accent) in enumerate(challenges):
        x = start_x + i * (card_w + gap)

        add_card(slide, x, y, card_w, card_h, fill_color=DARKER_CARD,
                 border_color=accent)

        # Top accent bar
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, card_w, Pt(4))
        bar.fill.solid()
        bar.fill.fore_color.rgb = accent
        bar.line.fill.background()

        # "CHALLENGE" label
        add_text_box(slide, x + Inches(0.25), y + Inches(0.25),
                     card_w - Inches(0.5), Inches(0.3),
                     "CHALLENGE", font_size=12, bold=True, color=accent)

        # Challenge text
        add_text_box(slide, x + Inches(0.25), y + Inches(0.6),
                     card_w - Inches(0.5), Inches(1.0),
                     challenge, font_size=19, bold=True, color=WHITE)

        # Divider
        div = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            x + Inches(0.25), y + Inches(1.7),
            card_w - Inches(0.5), Pt(1))
        div.fill.solid()
        div.fill.fore_color.rgb = RGBColor(0x40, 0x40, 0x58)
        div.line.fill.background()

        # "MITIGATION" label
        add_text_box(slide, x + Inches(0.25), y + Inches(1.9),
                     card_w - Inches(0.5), Inches(0.3),
                     "MITIGATION", font_size=12, bold=True, color=GREEN)

        # Mitigation text
        add_text_box(slide, x + Inches(0.25), y + Inches(2.3),
                     card_w - Inches(0.5), Inches(1.3),
                     mitigation, font_size=17, color=LIGHT_GRAY)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 14 — Future Roadmap
# ═══════════════════════════════════════════════════════════════════════
def slide_roadmap():
    slide = add_slide()
    add_title(slide, "Future Roadmap")
    add_subtitle_line(slide, Inches(1.1))

    phases = [
        ("Phase 1", "Real-time retailer API partnerships", GREEN),
        ("Phase 2", "Geographic price localization (ZIP code level)", BLUE),
        ("Phase 3", "ML-based product entity resolution", PURPLE),
        ("Phase 4", "Mobile app with barcode scanning", ORANGE),
        ("Phase 5", "B2B integration (banking/finance apps)", RED),
    ]

    y_start = Inches(1.7)
    row_h = Inches(0.85)

    for i, (phase, desc, color) in enumerate(phases):
        y = y_start + i * row_h

        # Phase badge
        badge = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), y, Inches(1.5), Inches(0.6))
        badge.fill.solid()
        badge.fill.fore_color.rgb = color
        badge.line.fill.background()
        add_text_box(slide, Inches(0.8), y, Inches(1.5), Inches(0.6),
                     phase, font_size=16, bold=True, color=WHITE,
                     alignment=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

        # Connecting line
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Inches(2.5), y + Inches(0.27), Inches(0.5), Pt(2))
        line.fill.solid()
        line.fill.fore_color.rgb = color
        line.line.fill.background()

        # Description
        add_text_box(slide, Inches(3.2), y, Inches(9.0), Inches(0.6),
                     desc, font_size=22, color=WHITE,
                     anchor=MSO_ANCHOR.MIDDLE)

    # ROI projection card
    roi_y = y_start + 5 * row_h + Inches(0.3)
    add_card(slide, Inches(0.8), roi_y, Inches(11.7), Inches(0.8),
             fill_color=DARKER_CARD, border_color=GREEN)
    add_text_box(slide, Inches(0.8), roi_y + Inches(0.05), Inches(11.7), Inches(0.7),
                 "ROI Projection: 50K premium subscribers × $4.99/mo = $3M ARR",
                 font_size=22, bold=True, color=GREEN, alignment=PP_ALIGN.CENTER)


# ═══════════════════════════════════════════════════════════════════════
# SLIDE 15 — Q&A / Thank You
# ═══════════════════════════════════════════════════════════════════════
def slide_thank_you():
    slide = add_slide()

    # Top bar
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), SLIDE_W, Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GREEN
    bar.line.fill.background()

    # Big "Questions?"
    add_text_box(slide, Inches(0), Inches(1.8), SLIDE_W, Inches(1.5),
                 "Questions?", font_size=60, bold=True, color=WHITE,
                 alignment=PP_ALIGN.CENTER)

    # Line
    line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(5.5), Inches(3.5), Inches(2.3), Pt(3))
    line.fill.solid()
    line.fill.fore_color.rgb = GREEN
    line.line.fill.background()

    # Team names
    add_text_box(slide, Inches(0), Inches(4.0), SLIDE_W, Inches(0.5),
                 "Eduardo Salvador  ·  Pragya Kunwar  ·  Hellen Nyokusi  ·  Srawan Bhatt",
                 font_size=20, color=WHITE, alignment=PP_ALIGN.CENTER)

    # Thank you
    add_text_box(slide, Inches(0), Inches(5.0), SLIDE_W, Inches(0.6),
                 "Thank you!", font_size=28, bold=True, color=GREEN,
                 alignment=PP_ALIGN.CENTER)

    # Course info
    add_text_box(slide, Inches(0), Inches(5.8), SLIDE_W, Inches(0.4),
                 "BUPM-634-M20  ·  Initiating the Project  ·  Spring 2026",
                 font_size=14, color=MUTED, alignment=PP_ALIGN.CENTER)

    # Bottom bar
    bar2 = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.44), SLIDE_W, Inches(0.06))
    bar2.fill.solid()
    bar2.fill.fore_color.rgb = PURPLE
    bar2.line.fill.background()


# ═══════════════════════════════════════════════════════════════════════
# BUILD ALL SLIDES
# ═══════════════════════════════════════════════════════════════════════
slide_title()
slide_problem()
slide_solution()
slide_how_it_works()
slide_tech_stack()
slide_ai_tools()
slide_gantt()
slide_savings_report()
slide_smart_split()
slide_shopping_list()
slide_live_demo()
slide_results()
slide_challenges()
slide_roadmap()
slide_thank_you()

# Save
output_path = os.path.expanduser(
    "~/clawd/projects/bidbench-web/GrocerScan-Presentation.pptx")
os.makedirs(os.path.dirname(output_path), exist_ok=True)
prs.save(output_path)
print(f"✅ Presentation saved to {output_path}")
print(f"   Slides: {len(prs.slides)}")
print(f"   Dimensions: {prs.slide_width} x {prs.slide_height}")
