import { AnalysisResult, ReceiptItem, CategoryBreakdown, OptimalStoreAllocation } from './types';
import groceryData from '../data/grocery-prices.json';

function getItemById(id: string) {
  return groceryData.items.find(item => item.id === id);
}

function formatDisplayName(name: string, unit?: string): string {
  if (!unit) return name;
  return `${name} (${unit})`;
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
    name: formatDisplayName(matched.name, matched.unit),
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
  const storeMap: Record<string, { items: { name: string; price: number; yourPrice: number; unit?: string }[]; totalSavings: number }> = {};

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
      unit: item.matchedItem.unit,
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

// ==========================================================================
// RECEIPT 1: WALMART — "The Weekly Family Haul" (~$144)
// Big family shop. Walmart is already cheap but there are still savings to find.
// Shows the app works even when you're shopping at the cheapest store.
// ==========================================================================
const walmartItems: ReceiptItem[] = [
  // Produce (big family = lots of fresh food)
  buildReceiptItem('bananas-per-lb', 0.58, 4),
  buildReceiptItem('apples-gala-per-lb', 1.67, 3),
  buildReceiptItem('strawberries-1lb', 3.47, 1),
  buildReceiptItem('avocados-each', 1.08, 2),
  buildReceiptItem('baby-spinach-5oz', 2.97, 1),
  buildReceiptItem('romaine-lettuce-each', 1.98, 1),
  buildReceiptItem('broccoli-crown-per-lb', 1.78, 1),
  buildReceiptItem('carrots-1lb-bag', 1.18, 1),
  buildReceiptItem('potatoes-russet-5lb', 4.47, 1),
  buildReceiptItem('onions-yellow-per-lb', 1.28, 2),
  buildReceiptItem('tomatoes-roma-per-lb', 1.68, 2),
  // Dairy
  buildReceiptItem('whole-milk-gallon', 3.36, 1),
  buildReceiptItem('large-eggs-dozen', 2.47, 1),
  buildReceiptItem('butter-unsalted-1lb', 3.96, 1),
  buildReceiptItem('shredded-cheddar-8oz', 2.48, 2),
  buildReceiptItem('greek-yogurt-plain-32oz', 4.68, 1),
  buildReceiptItem('sour-cream-16oz', 1.98, 1),
  // Meat
  buildReceiptItem('chicken-breast-boneless-per-lb', 2.97, 3),
  buildReceiptItem('ground-beef-80-20-per-lb', 5.97, 1),
  buildReceiptItem('bacon-16oz', 5.97, 1),
  buildReceiptItem('hot-dogs-8ct', 2.48, 1),
  // Pantry
  buildReceiptItem('bread-white-loaf', 1.68, 2),
  buildReceiptItem('pasta-spaghetti-16oz', 1.28, 2),
  buildReceiptItem('cereal-cheerios-18oz', 4.98, 1),
  buildReceiptItem('peanut-butter-16oz', 2.97, 1),
  buildReceiptItem('canned-beans-black-15oz', 1.08, 3),
  buildReceiptItem('tomato-sauce-8oz', 0.78, 2),
  buildReceiptItem('white-rice-5lb', 3.97, 1),
  // Beverages
  buildReceiptItem('orange-juice-64oz', 3.97, 1),
  buildReceiptItem('water-bottles-24pack', 3.97, 1),
  buildReceiptItem('coca-cola-12pack', 7.48, 1),
  // Frozen
  buildReceiptItem('frozen-pizza-digiorno', 6.47, 1),
  buildReceiptItem('frozen-vegetables-mixed-16oz', 1.48, 2),
  buildReceiptItem('ice-cream-48oz', 4.48, 1),
  // Household
  buildReceiptItem('paper-towels-6roll', 6.47, 1),
  buildReceiptItem('dish-soap-16oz', 2.47, 1),
  buildReceiptItem('trash-bags-30ct', 5.47, 1),
];

// ==========================================================================
// RECEIPT 2: WHOLE FOODS — "The Health-Conscious Shopper" (~$169)
// Premium store, organic-leaning. BIG savings opportunity.
// This is the "wow" receipt — shows how much premium shoppers overpay.
// ==========================================================================
const wholeFoodsItems: ReceiptItem[] = [
  // Produce (organic premium)
  buildReceiptItem('bananas-per-lb', 0.79, 3),
  buildReceiptItem('avocados-each', 1.79, 2),
  buildReceiptItem('baby-spinach-5oz', 3.99, 1),
  buildReceiptItem('blueberries-6oz', 4.99, 1),
  buildReceiptItem('strawberries-1lb', 4.99, 1),
  buildReceiptItem('bell-pepper-red-each', 1.99, 2),
  buildReceiptItem('sweet-potatoes-per-lb', 1.99, 1),
  buildReceiptItem('mushrooms-white-8oz', 3.49, 1),
  buildReceiptItem('cauliflower-each', 4.49, 1),
  buildReceiptItem('cucumber-each', 1.49, 1),
  // Dairy (all premium)
  buildReceiptItem('whole-milk-gallon', 5.99, 1),
  buildReceiptItem('large-eggs-dozen', 5.99, 1),
  buildReceiptItem('greek-yogurt-plain-32oz', 6.49, 1),
  buildReceiptItem('butter-unsalted-1lb', 5.49, 1),
  buildReceiptItem('oat-milk-64oz', 4.99, 1),
  // Meat (grass-fed, wild-caught)
  buildReceiptItem('chicken-breast-boneless-per-lb', 8.49, 1),
  buildReceiptItem('salmon-fillet-per-lb', 14.99, 1),
  buildReceiptItem('ground-beef-80-20-per-lb', 8.99, 1),
  buildReceiptItem('ground-turkey-per-lb', 7.49, 1),
  // Pantry
  buildReceiptItem('olive-oil-16oz', 8.99, 1),
  buildReceiptItem('honey-12oz', 7.99, 1),
  buildReceiptItem('almond-milk-64oz', 3.99, 1),
  buildReceiptItem('coffee-ground-12oz', 10.99, 1),
  buildReceiptItem('oatmeal-42oz', 5.99, 1),
  buildReceiptItem('peanut-butter-16oz', 4.49, 1),
  // Snacks
  buildReceiptItem('granola-bars-6ct', 4.99, 1),
  buildReceiptItem('nuts-almonds-16oz', 8.99, 1),
];

// ==========================================================================
// RECEIPT 3: KROGER — "The Weeknight Dinner Run" (~$100)
// Mid-week top-up focused on dinner ingredients. Moderate savings.
// Relatable receipt everyone recognizes — grab stuff for the week's meals.
// ==========================================================================
const krogerItems: ReceiptItem[] = [
  // Produce (dinner essentials)
  buildReceiptItem('tomatoes-roma-per-lb', 1.79, 2),
  buildReceiptItem('onions-yellow-per-lb', 1.29, 2),
  buildReceiptItem('garlic-each', 0.79, 2),
  buildReceiptItem('bell-pepper-green-each', 1.29, 3),
  buildReceiptItem('broccoli-crown-per-lb', 2.49, 2),
  buildReceiptItem('romaine-lettuce-each', 2.49, 1),
  // Dairy
  buildReceiptItem('2pct-milk-gallon', 3.49, 1),
  buildReceiptItem('large-eggs-dozen', 3.29, 1),
  buildReceiptItem('shredded-cheddar-8oz', 2.79, 1),
  buildReceiptItem('cream-cheese-8oz', 2.49, 1),
  buildReceiptItem('heavy-cream-16oz', 3.49, 1),
  // Meat (dinner proteins)
  buildReceiptItem('chicken-breast-boneless-per-lb', 3.49, 3),
  buildReceiptItem('ground-turkey-per-lb', 5.49, 1),
  buildReceiptItem('salmon-fillet-per-lb', 10.99, 1),
  buildReceiptItem('italian-sausage-per-lb', 4.49, 1),
  // Pantry
  buildReceiptItem('pasta-spaghetti-16oz', 1.49, 2),
  buildReceiptItem('tomato-sauce-8oz', 0.99, 3),
  buildReceiptItem('chicken-broth-32oz', 2.49, 2),
  buildReceiptItem('olive-oil-16oz', 6.99, 1),
  buildReceiptItem('soy-sauce-10oz', 2.99, 1),
  // Frozen
  buildReceiptItem('frozen-vegetables-mixed-16oz', 1.79, 2),
  // Beverages
  buildReceiptItem('coffee-ground-12oz', 7.49, 1),
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
  walmart: buildAnalysis('walmart-demo', 'walmart', walmartItems, '2026-03-24'),
  kroger: buildAnalysis('kroger-demo', 'kroger', krogerItems, '2026-03-22'),
  whole_foods: buildAnalysis('wholefood-demo', 'whole_foods', wholeFoodsItems, '2026-03-20'),
};

export type SampleReceiptKey = keyof typeof sampleReceipts;
