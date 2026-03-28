import { NextRequest, NextResponse } from 'next/server';
import Fuse from 'fuse.js';
import groceryData from '../../../data/grocery-prices.json';

const fuse = new Fuse(groceryData.items, {
  keys: ['name', 'id'],
  threshold: 0.4,
  includeScore: true,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const store = (formData.get('store') as string) || 'walmart';
    
    // For demo: parse items from form data, or simulate
    const itemsRaw = formData.get('items') as string;
    
    let receiptItems: { name: string; price: number; quantity: number }[] = [];
    
    if (itemsRaw) {
      receiptItems = JSON.parse(itemsRaw);
    } else {
      // Simulate OCR extraction for demo
      receiptItems = [
        { name: 'Bananas', price: 1.74, quantity: 3 },
        { name: 'Whole Milk', price: 3.49, quantity: 1 },
        { name: 'Chicken Breast', price: 6.99, quantity: 2 },
        { name: 'Bread', price: 2.49, quantity: 1 },
        { name: 'Eggs', price: 3.99, quantity: 1 },
      ];
    }

    // Match items and compare prices
    const analyzedItems = receiptItems.map((item) => {
      const result = fuse.search(item.name);
      if (result.length === 0) {
        return {
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          status: 'similar' as const,
        };
      }

      const matched = result[0].item;
      const prices = matched.prices as Record<string, { price: number }>;
      
      let bestStore = '';
      let bestPrice = Infinity;
      for (const [s, p] of Object.entries(prices)) {
        if (p.price < bestPrice) {
          bestPrice = p.price;
          bestStore = s;
        }
      }

      const priceDiff = item.price - bestPrice;
      const pctDiff = (priceDiff / bestPrice) * 100;
      
      return {
        name: matched.name,
        price: item.price,
        quantity: item.quantity,
        matchedItem: matched,
        bestStore,
        bestPrice,
        savings: priceDiff > 0 ? Number((priceDiff * item.quantity).toFixed(2)) : 0,
        status: pctDiff > 8 ? 'overcharged' : pctDiff < -3 ? 'deal' : 'similar',
      };
    });

    const totalSpent = analyzedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const bestTotal = analyzedItems.reduce(
      (s, i) => s + (i.bestPrice || i.price) * i.quantity,
      0
    );

    return NextResponse.json({
      id: `analysis-${Date.now()}`,
      sourceStore: store,
      date: new Date().toISOString().split('T')[0],
      totalSpent: Number(totalSpent.toFixed(2)),
      bestAlternativeTotal: Number(bestTotal.toFixed(2)),
      savingsOpportunity: Number((totalSpent - bestTotal).toFixed(2)),
      items: analyzedItems,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze receipt' },
      { status: 500 }
    );
  }
}
