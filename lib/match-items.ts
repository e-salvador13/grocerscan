/**
 * Client-side item matching using Fuse.js.
 * Matches parsed receipt items against the grocery price database
 * and builds a full AnalysisResult, mirroring the server-side logic.
 */

import Fuse from 'fuse.js';
import groceryData from '../data/grocery-prices.json';
import type {
  AnalysisResult,
  ReceiptItem,
  CategoryBreakdown,
  OptimalStoreAllocation,
  GroceryItem,
} from './types';

const fuse = new Fuse(groceryData.items, {
  keys: ['name', 'id'],
  threshold: 0.4,
  includeScore: true,
});

function matchItem(
  name: string,
  price: number,
  quantity: number
): ReceiptItem {
  const results = fuse.search(name);

  if (results.length === 0) {
    return { name, price, quantity, status: 'similar' };
  }

  const matched = results[0].item as unknown as GroceryItem;
  const storePrices = matched.prices as Record<string, { price: number }>;

  let bestStore = '';
  let bestPrice = Infinity;
  for (const [store, sp] of Object.entries(storePrices)) {
    if (sp.price < bestPrice) {
      bestPrice = sp.price;
      bestStore = store;
    }
  }

  const savings = Number(((price - bestPrice) * quantity).toFixed(2));
  const pctDiff = ((price - bestPrice) / bestPrice) * 100;

  let status: 'overcharged' | 'deal' | 'similar' = 'similar';
  if (pctDiff > 8) status = 'overcharged';
  else if (pctDiff < -3) status = 'deal';

  return {
    name: matched.name,
    price,
    quantity,
    matchedItem: matched,
    bestStore,
    bestPrice,
    savings: savings > 0 ? savings : 0,
    status,
  };
}

function buildCategoryBreakdown(items: ReceiptItem[]): CategoryBreakdown[] {
  const cats: Record<string, { yourTotal: number; bestTotal: number; count: number }> = {};
  for (const item of items) {
    const cat = item.matchedItem?.category || 'other';
    if (!cats[cat]) cats[cat] = { yourTotal: 0, bestTotal: 0, count: 0 };
    cats[cat].yourTotal += item.price * item.quantity;
    cats[cat].bestTotal += (item.bestPrice || item.price) * item.quantity;
    cats[cat].count++;
  }
  return Object.entries(cats).map(([category, data]) => ({
    category,
    itemCount: data.count,
    yourTotal: Number(data.yourTotal.toFixed(2)),
    bestTotal: Number(data.bestTotal.toFixed(2)),
    variance: Number(
      (((data.yourTotal - data.bestTotal) / (data.bestTotal || 1)) * 100).toFixed(1)
    ),
  }));
}

function buildOptimalBasket(items: ReceiptItem[]): OptimalStoreAllocation[] {
  const storeMap: Record<
    string,
    { items: { name: string; price: number; yourPrice: number }[]; totalSavings: number }
  > = {};

  for (const item of items) {
    if (!item.matchedItem || !item.bestStore || !item.bestPrice) continue;
    if (!storeMap[item.bestStore]) {
      storeMap[item.bestStore] = { items: [], totalSavings: 0 };
    }
    const saving = (item.price - item.bestPrice) * item.quantity;
    storeMap[item.bestStore].items.push({
      name: item.name,
      price: item.bestPrice,
      yourPrice: item.price,
    });
    storeMap[item.bestStore].totalSavings += saving;
  }

  return Object.entries(storeMap)
    .map(([store, data]) => ({
      store,
      items: data.items,
      totalSavings: Number(data.totalSavings.toFixed(2)),
    }))
    .filter((a) => a.totalSavings > 0)
    .sort((a, b) => b.totalSavings - a.totalSavings);
}

export interface ParsedReceiptInput {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Takes parsed receipt items (from OCR) and produces a full AnalysisResult
 * suitable for the existing UI components.
 */
export function analyzeReceiptItems(
  parsedItems: ParsedReceiptInput[],
  sourceStore: string = 'upload'
): AnalysisResult {
  const items = parsedItems.map((i) => matchItem(i.name, i.price, i.quantity));

  const totalSpent = Number(
    items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)
  );
  const bestTotal = Number(
    items.reduce((s, i) => s + (i.bestPrice || i.price) * i.quantity, 0).toFixed(2)
  );
  const savings = Number((totalSpent - bestTotal).toFixed(2));
  const categoryBreakdown = buildCategoryBreakdown(items);
  const optimalBasket = buildOptimalBasket(items);
  const totalOptimalSavings = Number(
    optimalBasket.reduce((s, a) => s + a.totalSavings, 0).toFixed(2)
  );

  return {
    id: `upload-${Date.now()}`,
    sourceStore,
    date: new Date().toISOString().split('T')[0],
    totalSpent,
    bestAlternativeTotal: bestTotal,
    savingsOpportunity: savings > 0 ? savings : 0,
    items,
    categoryBreakdown,
    optimalBasket,
    totalOptimalSavings,
  };
}
