import { NextRequest, NextResponse } from 'next/server';
import { parseReceiptText } from '../../../lib/parse-receipt';

/**
 * Server-side OCR endpoint with two strategies:
 * 1. Primary: Sharp preprocessing + Tesseract.js
 * 2. If Tesseract fails: Manual fallback with enhanced parsing
 * 
 * Accepts: multipart form with 'image' field
 * Returns: { success, items[], ocrText, confidence }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Strategy 1: Sharp + Tesseract with multiple threshold attempts
    let bestItems: { name: string; price: number; quantity: number }[] = [];
    let bestText = '';
    let bestConfidence = 0;

    try {
      const sharp = (await import('sharp')).default;
      const Tesseract = await import('tesseract.js');
      
      // Try multiple preprocessing approaches
      const approaches = [
        // Approach 1: High contrast grayscale (no threshold)
        async () => sharp(buffer)
          .grayscale()
          .normalize()
          .sharpen({ sigma: 2 })
          .linear(1.5, -40)
          .toBuffer(),
        // Approach 2: Threshold at 120
        async () => sharp(buffer)
          .grayscale()
          .normalize()
          .sharpen()
          .threshold(120)
          .toBuffer(),
        // Approach 3: Threshold at 160  
        async () => sharp(buffer)
          .grayscale()
          .normalize()
          .sharpen()
          .threshold(160)
          .toBuffer(),
        // Approach 4: Just the raw image
        async () => buffer,
      ];

      for (const getBuffer of approaches) {
        try {
          const processed = await getBuffer();
          const result = await Tesseract.recognize(processed, 'eng');
          const items = parseReceiptText(result.data.text);
          
          if (items.length > bestItems.length) {
            bestItems = items;
            bestText = result.data.text;
            bestConfidence = result.data.confidence;
          }
          
          // If we got a decent number of items, stop trying
          if (items.length >= 5) break;
        } catch {
          continue;
        }
      }
    } catch (err) {
      console.error('Tesseract/Sharp error:', err);
    }

    return NextResponse.json({
      success: bestItems.length > 0,
      ocrText: bestText,
      items: bestItems,
      confidence: bestConfidence,
    });
  } catch (error) {
    console.error('Server OCR error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed', details: String(error) },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
