import { AnalysisResult, ReceiptItem, CategoryBreakdown, OptimalStoreAllocation } from './types';
import groceryData from '../data/grocery-prices.json';

function getItemById(id: string) {
  return groceryData.items.find(item => item.id === id);
}

function buildReceiptItem(itemId: string, receiptPrice: number, qty: number = 1): ReceiptItem {
  const matched = getItemById(itemId);
  if (!matched) {
    return { name: itemId, price: receiptPrice, quantity: qty, status: 'similar' };
  }

  const storePrices = matched.prices as Record<string, { price: number }>;
  let bestStore = '';
  let bestPrice = Infinity;
  for (const [store, sp] of Object.entries(storePrices)) {
    if (sp.price < bestPrice) {
      bestPrice = sp.price;
      bestStore = store;
    }
  }

  const savings = Number(((receiptPrice - bestPrice) * qty).toFixed(2));
  const pctDiff = ((receiptPrice - bestPrice) / bestPrice) * 100;
  let status: 'overcharged' | 'deal' | 'similar' = 'similar';
  if (pctDiff > 8) status = 'overcharged';
  else if (pctDiff < -3) status = 'deal';

  return {
    name: matched.name,
    price: receiptPrice,
    quantity: qty,
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
    variance: Number((((data.yourTotal - data.bestTotal) / data.bestTotal) * 100).toFixed(1)),
  }));
}

function buildOptimalBasket(items: ReceiptItem[]): OptimalStoreAllocation[] {
  const storeMap: Record<string, { items: { name: string; price: number; yourPrice: number }[]; totalSavings: number }> = {};

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
    .filter(a => a.totalSavings > 0)
    .sort((a, b) => b.totalSavings - a.totalSavings);
}

// ========== WALMART RECEIPT ==========
const walmartItems: ReceiptItem[] = [
  buildReceiptItem('bananas-per-lb', 0.58, 3),
  buildReceiptItem('apples-gala-per-lb', 1.47, 2),
  buildReceiptItem('strawberries-1lb', 2.97, 1),
  buildReceiptItem('avocados-each', 0.98, 4),
  buildReceiptItem('baby-spinach-5oz', 2.47, 1),
  buildReceiptItem('romaine-lettuce-each', 2.98, 1),
  buildReceiptItem('whole-milk-gallon', 3.36, 1),
  buildReceiptItem('large-eggs-dozen', 3.12, 2),
  buildReceiptItem('butter-unsalted-1lb', 3.98, 1),
  buildReceiptItem('shredded-cheddar-8oz', 2.98, 1),
  buildReceiptItem('chicken-breast-boneless-per-lb', 3.18, 3),
  buildReceiptItem('ground-beef-80-20-per-lb', 4.98, 2),
  buildReceiptItem('bacon-16oz', 5.47, 1),
  buildReceiptItem('bread-white-loaf', 1.28, 1),
  buildReceiptItem('pasta-spaghetti-16oz', 1.18, 2),
  buildReceiptItem('peanut-butter-16oz', 2.47, 1),
  buildReceiptItem('tomato-sauce-8oz', 1.98, 1),
  buildReceiptItem('orange-juice-64oz', 3.47, 1),
  buildReceiptItem('water-bottles-24pack', 3.48, 1),
  buildReceiptItem('frozen-pizza-digiorno', 5.97, 1),
  buildReceiptItem('frozen-vegetables-mixed-16oz', 1.28, 2),
  buildReceiptItem('paper-towels-6roll', 5.97, 1),
  buildReceiptItem('dish-soap-16oz', 2.97, 1),
];

// ========== KROGER RECEIPT ==========
const krogerItems: ReceiptItem[] = [
  buildReceiptItem('bananas-per-lb', 0.69, 2),
  buildReceiptItem('apples-gala-per-lb', 1.69, 3),
  buildReceiptItem('tomatoes-roma-per-lb', 2.29, 2),
  buildReceiptItem('potatoes-russet-5lb', 3.99, 1),
  buildReceiptItem('onions-yellow-per-lb', 2.99, 1),
  buildReceiptItem('2pct-milk-gallon', 3.49, 1),
  buildReceiptItem('large-eggs-dozen', 3.49, 1),
  buildReceiptItem('greek-yogurt-plain-32oz', 4.99, 1),
  buildReceiptItem('cream-cheese-8oz', 2.29, 1),
  buildReceiptItem('chicken-breast-boneless-per-lb', 3.49, 2),
  buildReceiptItem('ground-turkey-per-lb', 4.79, 1),
  buildReceiptItem('salmon-fillet-per-lb', 9.99, 1),
  buildReceiptItem('bread-wheat-loaf', 2.29, 1),
  buildReceiptItem('cereal-cheerios-18oz', 4.29, 1),
  buildReceiptItem('coffee-ground-12oz', 6.49, 1),
  buildReceiptItem('coca-cola-12pack', 6.49, 1),
  buildReceiptItem('ice-cream-48oz', 4.49, 1),
  buildReceiptItem('frozen-chicken-nuggets-24oz', 6.49, 1),
  buildReceiptItem('toilet-paper-12roll', 7.49, 1),
];

// ========== WHOLE FOODS RECEIPT ==========
const wholeFoodsItems: ReceiptItem[] = [
  buildReceiptItem('bananas-per-lb', 0.99, 2),
  buildReceiptItem('avocados-each', 1.99, 3),
  buildReceiptItem('baby-spinach-5oz', 3.99, 2),
  buildReceiptItem('blueberries-6oz', 4.99, 1),
  buildReceiptItem('bell-pepper-red-each', 1.99, 3),
  buildReceiptItem('whole-milk-gallon', 5.99, 1),
  buildReceiptItem('large-eggs-dozen', 5.99, 1),
  buildReceiptItem('greek-yogurt-plain-32oz', 6.49, 1),
  buildReceiptItem('shredded-cheddar-8oz', 4.99, 1),
  buildReceiptItem('chicken-breast-boneless-per-lb', 6.99, 2),
  buildReceiptItem('salmon-fillet-per-lb', 12.99, 1),
  buildReceiptItem('ground-beef-80-20-per-lb', 7.99, 1),
  buildReceiptItem('olive-oil-16oz', 7.99, 1),
  buildReceiptItem('honey-12oz', 7.99, 1),
  buildReceiptItem('almond-milk-64oz', 3.99, 1),
  buildReceiptItem('coffee-ground-12oz', 9.99, 1),
];

function buildAnalysis(
  id: string,
  store: string,
  items: ReceiptItem[],
  date: string
): AnalysisResult {
  const totalSpent = Number(items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2));
  const bestTotal = Number(items.reduce((sum, i) => sum + (i.bestPrice || i.price) * i.quantity, 0).toFixed(2));
  const savings = Number((totalSpent - bestTotal).toFixed(2));
  const categoryBreakdown = buildCategoryBreakdown(items);
  const optimalBasket = buildOptimalBasket(items);
  const totalOptimalSavings = Number(optimalBasket.reduce((s, a) => s + a.totalSavings, 0).toFixed(2));

  return {
    id,
    sourceStore: store,
    date,
    totalSpent,
    bestAlternativeTotal: bestTotal,
    savingsOpportunity: savings,
    items,
    categoryBreakdown,
    optimalBasket,
    totalOptimalSavings,
  };
}

export const sampleReceipts = {
  walmart: buildAnalysis('walmart-demo', 'walmart', walmartItems, '2025-03-24'),
  kroger: buildAnalysis('kroger-demo', 'kroger', krogerItems, '2025-03-22'),
  whole_foods: buildAnalysis('wholefood-demo', 'whole_foods', wholeFoodsItems, '2025-03-20'),
};

export type SampleReceiptKey = keyof typeof sampleReceipts;
