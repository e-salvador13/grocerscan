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

function buildStoreReceiptItem(itemId: string, store: string, qty: number = 1): ReceiptItem {
  const item = getItemById(itemId);
  if (!item) return { name: itemId, price: 0, quantity: qty, status: 'similar' };
  const storePrice = (item.prices as Record<string, { price: number }>)[store]?.price;
  if (storePrice == null) return { name: item.name, price: 0, quantity: qty, status: 'similar' };
  return buildReceiptItem(itemId, storePrice, qty);
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
  buildStoreReceiptItem('bananas-per-lb', 'walmart', 4),
  buildStoreReceiptItem('apples-gala-per-lb', 'walmart', 3),
  buildStoreReceiptItem('strawberries-1lb', 'walmart', 1),
  buildStoreReceiptItem('avocados-each', 'walmart', 2),
  buildStoreReceiptItem('baby-spinach-5oz', 'walmart', 1),
  buildStoreReceiptItem('romaine-lettuce-each', 'walmart', 1),
  buildStoreReceiptItem('broccoli-crown-per-lb', 'walmart', 1),
  buildStoreReceiptItem('carrots-1lb-bag', 'walmart', 1),
  buildStoreReceiptItem('potatoes-russet-5lb', 'walmart', 1),
  buildStoreReceiptItem('onions-yellow-per-lb', 'walmart', 2),
  buildStoreReceiptItem('tomatoes-roma-per-lb', 'walmart', 2),
  // Dairy
  buildStoreReceiptItem('whole-milk-gallon', 'walmart', 1),
  buildStoreReceiptItem('large-eggs-dozen', 'walmart', 1),
  buildStoreReceiptItem('butter-unsalted-1lb', 'walmart', 1),
  buildStoreReceiptItem('shredded-cheddar-8oz', 'walmart', 2),
  buildStoreReceiptItem('greek-yogurt-plain-32oz', 'walmart', 1),
  buildStoreReceiptItem('sour-cream-16oz', 'walmart', 1),
  // Meat
  buildStoreReceiptItem('chicken-breast-boneless-per-lb', 'walmart', 3),
  buildStoreReceiptItem('ground-beef-80-20-per-lb', 'walmart', 1),
  buildStoreReceiptItem('bacon-16oz', 'walmart', 1),
  buildStoreReceiptItem('hot-dogs-8ct', 'walmart', 1),
  // Pantry
  buildStoreReceiptItem('bread-white-loaf', 'walmart', 2),
  buildStoreReceiptItem('pasta-spaghetti-16oz', 'walmart', 2),
  buildStoreReceiptItem('cereal-cheerios-18oz', 'walmart', 1),
  buildStoreReceiptItem('peanut-butter-16oz', 'walmart', 1),
  buildStoreReceiptItem('canned-beans-black-15oz', 'walmart', 3),
  buildStoreReceiptItem('tomato-sauce-8oz', 'walmart', 2),
  buildStoreReceiptItem('white-rice-5lb', 'walmart', 1),
  // Beverages
  buildStoreReceiptItem('orange-juice-64oz', 'walmart', 1),
  buildStoreReceiptItem('water-bottles-24pack', 'walmart', 1),
  buildStoreReceiptItem('coca-cola-12pack', 'walmart', 1),
  // Frozen
  buildStoreReceiptItem('frozen-pizza-digiorno', 'walmart', 1),
  buildStoreReceiptItem('frozen-vegetables-mixed-16oz', 'walmart', 2),
  buildStoreReceiptItem('ice-cream-48oz', 'walmart', 1),
  // Household
  buildStoreReceiptItem('paper-towels-6roll', 'walmart', 1),
  buildStoreReceiptItem('dish-soap-16oz', 'walmart', 1),
  buildStoreReceiptItem('trash-bags-30ct', 'walmart', 1),
];

// ==========================================================================
// RECEIPT 2: WHOLE FOODS — "The Health-Conscious Shopper" (~$169)
// Premium store, organic-leaning. BIG savings opportunity.
// This is the "wow" receipt — shows how much premium shoppers overpay.
// ==========================================================================
const wholeFoodsItems: ReceiptItem[] = [
  // Produce (organic premium)
  buildStoreReceiptItem('bananas-per-lb', 'whole_foods', 3),
  buildStoreReceiptItem('avocados-each', 'whole_foods', 2),
  buildStoreReceiptItem('baby-spinach-5oz', 'whole_foods', 1),
  buildStoreReceiptItem('blueberries-6oz', 'whole_foods', 1),
  buildStoreReceiptItem('strawberries-1lb', 'whole_foods', 1),
  buildStoreReceiptItem('bell-pepper-red-each', 'whole_foods', 2),
  buildStoreReceiptItem('sweet-potatoes-per-lb', 'whole_foods', 1),
  buildStoreReceiptItem('mushrooms-white-8oz', 'whole_foods', 1),
  buildStoreReceiptItem('cauliflower-each', 'whole_foods', 1),
  buildStoreReceiptItem('cucumber-each', 'whole_foods', 1),
  // Dairy (all premium)
  buildStoreReceiptItem('whole-milk-gallon', 'whole_foods', 1),
  buildStoreReceiptItem('large-eggs-dozen', 'whole_foods', 1),
  buildStoreReceiptItem('greek-yogurt-plain-32oz', 'whole_foods', 1),
  buildStoreReceiptItem('butter-unsalted-1lb', 'whole_foods', 1),
  buildStoreReceiptItem('oat-milk-64oz', 'whole_foods', 1),
  // Meat (grass-fed, wild-caught)
  buildStoreReceiptItem('chicken-breast-boneless-per-lb', 'whole_foods', 1),
  buildStoreReceiptItem('salmon-fillet-per-lb', 'whole_foods', 1),
  buildStoreReceiptItem('ground-beef-80-20-per-lb', 'whole_foods', 1),
  buildStoreReceiptItem('ground-turkey-per-lb', 'whole_foods', 1),
  // Pantry
  buildStoreReceiptItem('olive-oil-16oz', 'whole_foods', 1),
  buildStoreReceiptItem('honey-12oz', 'whole_foods', 1),
  buildStoreReceiptItem('almond-milk-64oz', 'whole_foods', 1),
  buildStoreReceiptItem('coffee-ground-12oz', 'whole_foods', 1),
  buildStoreReceiptItem('oatmeal-42oz', 'whole_foods', 1),
  buildStoreReceiptItem('peanut-butter-16oz', 'whole_foods', 1),
  // Snacks
  buildStoreReceiptItem('granola-bars-6ct', 'whole_foods', 1),
  buildStoreReceiptItem('nuts-almonds-16oz', 'whole_foods', 1),
];

// ==========================================================================
// RECEIPT 3: KROGER — "The Weeknight Dinner Run" (~$100)
// Mid-week top-up focused on dinner ingredients. Moderate savings.
// Relatable receipt everyone recognizes — grab stuff for the week's meals.
// ==========================================================================
const krogerItems: ReceiptItem[] = [
  // Produce (dinner essentials)
  buildStoreReceiptItem('tomatoes-roma-per-lb', 'kroger', 2),
  buildStoreReceiptItem('onions-yellow-per-lb', 'kroger', 2),
  buildStoreReceiptItem('garlic-each', 'kroger', 2),
  buildStoreReceiptItem('bell-pepper-green-each', 'kroger', 3),
  buildStoreReceiptItem('broccoli-crown-per-lb', 'kroger', 2),
  buildStoreReceiptItem('romaine-lettuce-each', 'kroger', 1),
  // Dairy
  buildStoreReceiptItem('2pct-milk-gallon', 'kroger', 1),
  buildStoreReceiptItem('large-eggs-dozen', 'kroger', 1),
  buildStoreReceiptItem('shredded-cheddar-8oz', 'kroger', 1),
  buildStoreReceiptItem('cream-cheese-8oz', 'kroger', 1),
  buildStoreReceiptItem('heavy-cream-16oz', 'kroger', 1),
  // Meat (dinner proteins)
  buildStoreReceiptItem('chicken-breast-boneless-per-lb', 'kroger', 3),
  buildStoreReceiptItem('ground-turkey-per-lb', 'kroger', 1),
  buildStoreReceiptItem('salmon-fillet-per-lb', 'kroger', 1),
  buildStoreReceiptItem('italian-sausage-per-lb', 'kroger', 1),
  // Pantry
  buildStoreReceiptItem('pasta-spaghetti-16oz', 'kroger', 2),
  buildStoreReceiptItem('tomato-sauce-8oz', 'kroger', 3),
  buildStoreReceiptItem('chicken-broth-32oz', 'kroger', 2),
  buildStoreReceiptItem('olive-oil-16oz', 'kroger', 1),
  buildStoreReceiptItem('soy-sauce-10oz', 'kroger', 1),
  // Frozen
  buildStoreReceiptItem('frozen-vegetables-mixed-16oz', 'kroger', 2),
  // Beverages
  buildStoreReceiptItem('coffee-ground-12oz', 'kroger', 1),
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
