import { NextRequest, NextResponse } from 'next/server';

/**
 * Vision-based receipt OCR using Claude API.
 * Sends the receipt image directly to Claude for accurate extraction.
 * 
 * Accepts: multipart form with 'image' field (JPEG/PNG)
 * Returns: { success, items[], store?, total? }
 */

interface ExtractedItem {
  name: string;
  price: number;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    // Use GROCERSCAN_ANTHROPIC_KEY to avoid system env override
    const apiKey = process.env.GROCERSCAN_ANTHROPIC_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROCERSCAN_ANTHROPIC_KEY not configured in .env' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Detect media type from magic bytes (FormData type can be unreliable)
    const header = new Uint8Array(arrayBuffer.slice(0, 4));
    let mediaType = file.type;
    if (!mediaType || mediaType === 'application/octet-stream') {
      if (header[0] === 0xFF && header[1] === 0xD8) mediaType = 'image/jpeg';
      else if (header[0] === 0x89 && header[1] === 0x50) mediaType = 'image/png';
      else if (header[0] === 0x52 && header[1] === 0x49) mediaType = 'image/webp';
      else mediaType = 'image/jpeg';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: `Extract all grocery items from this receipt image. Return ONLY valid JSON, no markdown, no explanation.

Format:
{"store":"Store Name","items":[{"name":"Human-readable item name","price":1.99,"quantity":1}],"subtotal":0.00,"tax":0.00,"total":0.00}

Rules:
- Use clear, human-readable names (e.g., "Boneless Chicken Breast" not "BNLS CHKN BRST")
- For weighted/per-pound items (meat, produce sold by weight), return the PER-UNIT price (price per lb), NOT the total. Look for "per lb", "/lb", "@X.XX/lb" on the receipt. If the receipt shows "4.45 lb @ $2.69/lb = $11.97", return price: 2.69 and quantity: 1
- For fixed-quantity items with multipliers like "x2" or "Qty 2", set quantity to that number and price to the TOTAL price shown on that line
- For single items, price is the number shown on the receipt line
- Do NOT include subtotal, tax, or total as items
- Prices should be numbers, not strings`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Vision OCR] Claude API error:', response.status, errText);
      return NextResponse.json(
        { error: 'Vision API error', details: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse JSON (handle potential markdown fences)
    let parsed;
    try {
      const jsonStr = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[Vision OCR] JSON parse failed:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Could not parse vision response', raw: text },
        { status: 500 }
      );
    }

    const items: ExtractedItem[] = (parsed.items || [])
      .map((item: any) => ({
        name: String(item.name || '').trim(),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      }))
      .filter((item: ExtractedItem) => item.name.length > 0 && item.price > 0);

    return NextResponse.json({
      success: items.length > 0,
      items,
      store: parsed.store || null,
      subtotal: parsed.subtotal || null,
      tax: parsed.tax || null,
      total: parsed.total || null,
    });
  } catch (error) {
    console.error('[Vision OCR] Error:', error);
    return NextResponse.json(
      { error: 'Vision OCR failed', details: String(error) },
      { status: 500 }
    );
  }
}
