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
 * Cleans up OCR-extracted item names:
 * - Strips UPC/barcode numbers
 * - Removes tax flags (F, N, X, T, J, O, etc.)
 * - Title-cases the result
 */
function cleanItemName(raw: string): string {
  let name = raw
    // Remove UPC / barcode digits (sequences of 6+ digits)
    .replace(/\b\d{6,}\b/g, '')
    // Remove single-letter tax flags often at end of line
    .replace(/\s+[FNXTJORB]\s*$/i, '')
    // Remove "GV" or "GR VAL" (Great Value brand prefix on Walmart receipts)
    // but keep it if it looks like part of a word
    .replace(/\bGR\s*VAL(?:UE)?\b/gi, '')
    // Remove leading item count like "2 @" or "3@"
    .replace(/^\d+\s*@\s*/, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Title case
  name = name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return name;
}

/**
 * Parse raw OCR text into structured receipt items.
 * Looks for lines containing a price pattern ($X.XX or X.XX at end of line).
 */
export function parseReceiptText(ocrText: string): ParsedItem[] {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];

  // Skip lines that look like headers, totals, or metadata
  const skipPatterns = [
    /^\s*(sub\s*total|subtotal|total|tax|change|cash|credit|debit|visa|master|amex|tend|balance)/i,
    /^\s*(thank|welcome|store|manager|cashier|phone|tel|address|receipt|transaction|saving)/i,
    /^\s*(date|time|ref|terminal|card|approval|#|number)/i,
    /^\s*\*{3,}/,             // decorative lines
    /^\s*-{3,}/,
    /^\s*={3,}/,
    /^\s*ST#|OP#|TE#|TR#/i,  // Walmart terminal codes
    /PRICE\s*MATCH/i,
    /ROLLBACK/i,
    /YOU\s*SAVED/i,
    /EBT|SNAP|WIC/i,
    /ITEM\s*COUNT/i,
  ];

  for (const line of lines) {
    // Skip short lines and header/footer patterns
    if (line.length < 4) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;

    // Pattern 1: "ITEM NAME    $X.XX" or "ITEM NAME    X.XX"
    // Pattern 2: "ITEM NAME  00123456789  $X.XX F"
    // We look for a price near the end of the line
    const priceMatch = line.match(
      /^(.+?)\s+\$?\s*(\d{1,4}\.\d{2})\s*[A-Z]?\s*$/
    );
    if (priceMatch) {
      const rawName = priceMatch[1];
      const price = parseFloat(priceMatch[2]);

      // Skip if price is unreasonably high (probably a total) or zero
      if (price <= 0 || price > 200) continue;

      const name = cleanItemName(rawName);
      if (name.length < 2) continue;

      items.push({
        name,
        price,
        quantity: 1,
      });
      continue;
    }

    // Pattern 3: Price on its own preceded by item name on previous line
    // (handled by checking if next line is just a price — skip for now, 
    //  most receipts keep item + price on same line)

    // Pattern 4: "2 @ $1.50    $3.00" → quantity line
    const qtyMatch = line.match(
      /^(\d+)\s*@\s*\$?\s*(\d{1,4}\.\d{2})\s+\$?\s*(\d{1,4}\.\d{2})/
    );
    if (qtyMatch) {
      const qty = parseInt(qtyMatch[1], 10);
      const unitPrice = parseFloat(qtyMatch[2]);
      // Use the last item's name if available
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        lastItem.quantity = qty;
        lastItem.price = unitPrice;
      }
    }
  }

  return items;
}
