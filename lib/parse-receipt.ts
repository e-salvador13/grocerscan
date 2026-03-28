/**
 * Receipt OCR text parser.
 * Extracts item names and prices from raw OCR text.
 * Handles common US grocery receipt formats (Walmart, Kroger, Target, etc.)
 */

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Known receipt abbreviations → human-readable names.
 * Walmart uses cryptic short codes on receipts.
 */
const ABBREVIATION_MAP: Record<string, string> = {
  'BNLS BRST': 'Boneless Chicken Breast',
  'BNLS BRST MD': 'Boneless Chicken Breast',
  'CHK BST BNLS': 'Boneless Chicken Breast',
  'NY STRIP THN': 'NY Strip Steak Thin',
  'NY STRIP': 'NY Strip Steak',
  'BROC CROWNS': 'Broccoli Crowns',
  'BROC CROWN': 'Broccoli Crowns',
  'GREEN ONIONS': 'Green Onions',
  'GRN ONIONS': 'Green Onions',
  'SRIRACHA SCE': 'Sriracha Sauce',
  'HOISIN SAUCE': 'Hoisin Sauce',
  'OYSTER SAUCE': 'Oyster Sauce',
  'SOY SAUCE': 'Soy Sauce',
  'SESAME OIL': 'Sesame Oil',
  'SESAME SEED': 'Sesame Seeds',
  'ACOCADO OIL': 'Avocado Oil',
  'AVOCADO OIL': 'Avocado Oil',
  'WHT GRAN SUG': 'White Granulated Sugar',
  'WM SEA SALT': 'Sea Salt',
  'GR PEPERCRN': 'Ground Peppercorn',
  'GV ZPR SANDW': 'Zippered Sandwich Bags',
  'GV GF FUSILL': 'Gluten Free Fusilli',
  'GV MIX VEG': 'Mixed Vegetables',
  'GV WHITE': 'White Rice',
  'NF POP UP': 'Pop Up Sponges',
  'MAHATMA JASM': 'Jasmine Rice',
  'PAL ORI': 'Palmolive Original',
  'PEARS BAR': 'Pears Soap Bar',
  'BNTYSAS2': 'Bounty Paper Towels',
  'EGG BEST ORG': 'Organic Eggs',
  'EQ DUO PACK': 'Equate Duo Pack',
  'SUSHI CHEF': 'Sushi Chef Rice Vinegar',
  'CHRMNSFR4': 'Charmin Soft 4-Roll',
  'TIDEHEORG107': 'Tide HE Original',
  'SHOPPING BAG': 'Shopping Bag',
  'SOG POUF': 'Shower Pouf',
  'TAL 4PK': 'Tall Kitchen Bags 4pk',
  'TAL 2PK': 'Tall Kitchen Bags 2pk',
  'PALOMA 180Z': 'Paloma Ceramic Bowl 18oz',
  'CCSERVINGBWL': 'Serving Bowl',
  'GLD-HARV': 'Gold Harvest',
  'MS10X14BOARD': 'Cutting Board 10x14',
  'NUTELLA': 'Nutella',
  'SWEETARTS': 'Sweetarts',
  'BANANAS': 'Bananas',
  'ONIONS': 'Onions',
  'POTATOES': 'Potatoes',
  'GARLIC': 'Garlic',
  'TOMATOES': 'Tomatoes',
  'APPLES': 'Apples',
  'ORANGES': 'Oranges',
  'LETTUCE': 'Lettuce',
  'CUCUMBER': 'Cucumber',
  'CARROTS': 'Carrots',
  'CELERY': 'Celery',
  'MILK': 'Milk',
  'EGGS': 'Eggs',
  'BUTTER': 'Butter',
  'BREAD': 'Bread',
  'CHEESE': 'Cheese',
  'YOGURT': 'Yogurt',
  'CHICKEN': 'Chicken',
  'GROUND BEEF': 'Ground Beef',
  'BACON': 'Bacon',
  'RICE': 'Rice',
  'PASTA': 'Pasta',
  'CEREAL': 'Cereal',
  'COFFEE': 'Coffee',
  'SUGAR': 'Sugar',
  'FLOUR': 'Flour',
  'OLV OIL': 'Olive Oil',
  'OLIVE OIL': 'Olive Oil',
  'VEG OIL': 'Vegetable Oil',
  'KETCHUP': 'Ketchup',
  'MUSTARD': 'Mustard',
  'MAYO': 'Mayonnaise',
  'PNUT BTTR': 'Peanut Butter',
  'PNT BUTTER': 'Peanut Butter',
  'PEANUT BUTTER': 'Peanut Butter',
  'JELLY': 'Jelly',
  'WATER': 'Water',
  'SODA': 'Soda',
  'JUICE': 'Juice',
  'TP': 'Toilet Paper',
  'PAPER TOWEL': 'Paper Towels',
  'DISH SOAP': 'Dish Soap',
  'LAUNDRY DET': 'Laundry Detergent',
  'TRASH BAGS': 'Trash Bags',
  'CHIPS': 'Chips',
  'CRACKERS': 'Crackers',
  'COOKIES': 'Cookies',
  'ICE CREAM': 'Ice Cream',
  'FROZEN VEG': 'Frozen Vegetables',
  'CAN CORN': 'Canned Corn',
  'CAN BEANS': 'Canned Beans',
  'TUNA': 'Canned Tuna',
  'SOUP': 'Soup',
  'TOMATO SCE': 'Tomato Sauce',
  'TOMATO SAUCE': 'Tomato Sauce',
  'PASTA SCE': 'Pasta Sauce',
  'SALSA': 'Salsa',
  'TORT CHIPS': 'Tortilla Chips',
  'TORTILLAS': 'Tortillas',
};

/**
 * Try to expand an abbreviated item name using the map.
 * Checks the full name first, then progressively shorter prefixes.
 */
function expandAbbreviation(raw: string): string {
  const upper = raw.toUpperCase().trim();

  // Direct match
  if (ABBREVIATION_MAP[upper]) return ABBREVIATION_MAP[upper];

  // Try matching without trailing numbers/sizes
  const withoutTrailing = upper.replace(/\s+\d+\w*$/, '').trim();
  if (ABBREVIATION_MAP[withoutTrailing]) return ABBREVIATION_MAP[withoutTrailing];

  // Try matching first N words
  const words = upper.split(/\s+/);
  for (let len = Math.min(words.length, 4); len >= 1; len--) {
    const prefix = words.slice(0, len).join(' ');
    if (ABBREVIATION_MAP[prefix]) return ABBREVIATION_MAP[prefix];
  }

  return '';
}

/**
 * Clean up an item name from OCR text
 */
function cleanItemName(raw: string): string {
  let name = raw
    // Remove UPC/barcode (6+ digits)
    .replace(/\b\d{6,}\w*\b/g, '')
    // Remove single-letter flags at end (F, T, X, J, N, etc.)
    .replace(/\s+[FTXJNORBD]\s*$/i, '')
    // Remove "KF" suffix (Walmart weighed item flag)
    .replace(/\s*KF\s*$/i, '')
    // Remove leading/trailing whitespace
    .trim()
    // Collapse multiple spaces
    .replace(/\s+/g, ' ');

  if (name.length < 2) return '';

  // Try abbreviation expansion
  const expanded = expandAbbreviation(name);
  if (expanded) return expanded;

  // Title case as fallback
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Lines to skip — headers, totals, metadata
 */
const SKIP_PATTERNS = [
  /^\s*(sub\s*total|subtotal)/i,
  /^\s*total\b/i,
  /^\s*(tax\s*\d|hst|gst|pst)/i,
  /^\s*(change|cash|credit|debit|visa|master|amex|discover)\b/i,
  /^\s*tend\b/i,
  /^\s*(thank|welcome|store\s+\d|manager|cashier|phone|tel|address)/i,
  /^\s*(date|time|ref\s*#|terminal|card\s*#|approval|trans\s*id)/i,
  /^\s*(receipt|transaction|saving|you\s*saved|price\s*match)/i,
  /^\s*ST#|OP#|TE#|TR#/i,
  /^\s*(EBT|SNAP|WIC)\b/i,
  /^\s*ITEM\s*COUNT/i,
  /^\s*\*{3,}/,
  /^\s*-{3,}/,
  /^\s*={3,}/,
  /ROLLBACK/i,
  /signature\s*verified/i,
  /^\s*\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}/,  // Date/time lines
  /^\s*\d{3}[-.]?\d{3}[-.]?\d{4}/,  // Phone numbers
  /^\s*\d+\s+(MISSISSAUGA|SCHILLINGER|BRAMPTON|MOBILE)/i,  // Address lines
  /^\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d/i,  // Canadian postal codes
  /^\s*\d{5}/,  // US zip codes at start
  /contest|rules.*apply/i,
  /gift\s*card/i,
  /save\s*money/i,
  /live\s*better/i,
  /walmart/i,
  /kroger/i,
  /target/i,
];

/**
 * Check if a line is a weight/per-lb line (for produce items)
 * e.g., "1.24 lb  e  1 lb /0.78"
 */
function isWeightLine(line: string): boolean {
  return /\d+\.\d+\s*lb\b/i.test(line) && /\/\d+\.\d+/.test(line);
}

/**
 * Parse raw OCR text into structured receipt items.
 */
export function parseReceiptText(ocrText: string): ParsedItem[] {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  let pendingItemName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip short lines
    if (line.length < 3) continue;

    // Skip known headers/footers/metadata
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    // Skip weight detail lines but grab the price for the pending item
    if (isWeightLine(line)) {
      // Price should be on the same or next element — check for price at end
      const weightPrice = line.match(/(\d{1,4}\.\d{2})\s*[A-Z]?\s*$/);
      // Look ahead for price on next line if not found here
      if (!weightPrice && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextPrice = nextLine.match(/^\s*\$?\s*(\d{1,4}\.\d{2})\s*[A-Z]?\s*$/);
        if (nextPrice && pendingItemName) {
          const price = parseFloat(nextPrice[1]);
          if (price > 0 && price < 200) {
            const name = cleanItemName(pendingItemName);
            if (name.length >= 2) {
              items.push({ name, price, quantity: 1 });
            }
          }
          pendingItemName = null;
          i++; // skip the price line
          continue;
        }
      }
      continue;
    }

    // Main pattern: Look for a price anywhere near the end of the line
    // Walmart format: "ITEM NAME  UPC  F    PRICE T"
    // The price is typically: digits.digits, possibly preceded by $ 
    // Followed by optional space + single letter (T, X, J, D, F, N)
    const priceMatch = line.match(
      /(\d{1,4}\.\d{2})\s*[TXJDFNORB]?\s*$/
    );

    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);

      // Skip unreasonable prices (likely totals or metadata)
      if (price <= 0 || price > 200) continue;

      // Extract everything before the price as the item description
      const priceIndex = line.lastIndexOf(priceMatch[1]);
      let rawName = line.substring(0, priceIndex).trim();

      // Remove trailing single letters (tax flags before the price)
      rawName = rawName.replace(/\s+[FTXJNORBD]\s*$/i, '');
      // Remove trailing $ if present
      rawName = rawName.replace(/\$\s*$/, '');

      const name = cleanItemName(rawName);
      if (name.length < 2) continue;

      // Skip if this looks like a subtotal/total line we missed
      if (/subtotal|total|tax|tend|change/i.test(name)) continue;

      items.push({ name, price, quantity: 1 });
      pendingItemName = null;
      continue;
    }

    // No price on this line — might be a produce item with price on next line
    // Check if it looks like an item (has letters, not just numbers)
    if (/[A-Z]{2,}/i.test(line) && !/^\d+$/.test(line)) {
      // Check if the next line has a price or is a weight line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (isWeightLine(nextLine)) {
          // This is a produce item, the price might be on the weight line or the line after
          pendingItemName = line;

          // Check if price is at the end of the weight line's following content
          // Look ahead to find the price
          const weightLinePrice = nextLine.match(/(\d{1,4}\.\d{2})\s*[A-Z]?\s*$/);
          if (weightLinePrice) {
            const price = parseFloat(weightLinePrice[1]);
            if (price > 0 && price < 200) {
              const name = cleanItemName(line);
              if (name.length >= 2) {
                items.push({ name, price, quantity: 1 });
              }
            }
            pendingItemName = null;
            i++; // skip weight line
            continue;
          }
        }

        // Check if next line is just a price
        const nextPrice = nextLine.match(/^\s*\$?\s*(\d{1,4}\.\d{2})\s*[A-Z]?\s*$/);
        if (nextPrice) {
          const price = parseFloat(nextPrice[1]);
          if (price > 0 && price < 200) {
            const name = cleanItemName(line);
            if (name.length >= 2) {
              items.push({ name, price, quantity: 1 });
            }
          }
          i++; // skip the price line
          continue;
        }
      }
    }
  }

  // Deduplicate: if same name appears multiple times, increase quantity
  const deduped = new Map<string, ParsedItem>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (deduped.has(key)) {
      const existing = deduped.get(key)!;
      existing.quantity += item.quantity;
    } else {
      deduped.set(key, { ...item });
    }
  }

  return Array.from(deduped.values());
}
