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

/**
 * Alias map: common receipt OCR names → grocery-prices.json item IDs.
 * This handles fuzzy match failures for branded/abbreviated receipt text.
 */
const ITEM_ALIASES: Record<string, string> = {
  // Meat & Seafood
  'boneless chicken breast': 'chicken-breast-boneless-per-lb',
  'bnls chicken breast': 'chicken-breast-boneless-per-lb',
  'chicken breast': 'chicken-breast-boneless-per-lb',
  'chkn breast': 'chicken-breast-boneless-per-lb',
  'ground turkey': 'ground-turkey-per-lb',
  'grnd turkey': 'ground-turkey-per-lb',
  'atlantic salmon': 'salmon-fillet-per-lb',
  'salmon fillet': 'salmon-fillet-per-lb',
  'salmon': 'salmon-fillet-per-lb',
  'ground beef': 'ground-beef-80-20-per-lb',
  'grnd beef': 'ground-beef-80-20-per-lb',
  '80/20 ground beef': 'ground-beef-80-20-per-lb',
  'ribeye steak': 'steak-ribeye-per-lb',
  'ribeye': 'steak-ribeye-per-lb',
  'pork chops': 'pork-chops-per-lb',
  'chicken thighs': 'chicken-thighs-per-lb',
  'italian sausage': 'italian-sausage-per-lb',
  'hot dogs': 'hot-dogs-8ct',
  'bacon': 'bacon-16oz',
  'deli turkey': 'deli-turkey-per-lb',
  'deli ham': 'deli-ham-per-lb',
  'tilapia': 'tilapia-fillet-per-lb',
  'shrimp': 'shrimp-raw-1lb',
  'whole chicken': 'whole-chicken-per-lb',

  // Dairy
  'shredded cheddar cheese': 'shredded-cheddar-8oz',
  'shredded cheddar': 'shredded-cheddar-8oz',
  'cheddar cheese shredded': 'shredded-cheddar-8oz',
  'sharp cheddar': 'shredded-cheddar-8oz',
  'mild cheddar': 'shredded-cheddar-8oz',
  'american cheese': 'sliced-american-cheese-12ct',
  'sliced cheese': 'sliced-american-cheese-12ct',
  'cream cheese': 'cream-cheese-8oz',
  'mozzarella cheese': 'mozzarella-shredded-8oz',
  'mozzarella': 'mozzarella-shredded-8oz',
  'parmesan cheese': 'parmesan-grated-8oz',
  'parmesan': 'parmesan-grated-8oz',
  'cottage cheese': 'cottage-cheese-16oz',
  'greek yogurt': 'greek-yogurt-plain-32oz',
  'yogurt': 'yogurt-cups-4pack',
  'sour cream': 'sour-cream-16oz',
  'heavy cream': 'heavy-cream-16oz',
  'half and half': 'half-and-half-32oz',
  'half & half': 'half-and-half-32oz',
  'butter': 'butter-unsalted-1lb',
  'unsalted butter': 'butter-unsalted-1lb',
  'whole milk': 'whole-milk-gallon',
  'milk gallon': 'whole-milk-gallon',
  '2% milk': '2pct-milk-gallon',
  '2 percent milk': '2pct-milk-gallon',
  'almond milk': 'almond-milk-64oz',
  'oat milk': 'oat-milk-64oz',
  'eggs': 'large-eggs-dozen',
  'large eggs': 'large-eggs-dozen',
  'dozen eggs': 'large-eggs-dozen',
  'coffee creamer': 'coffee-creamer-32oz',
  'whipped cream': 'whipped-cream-8oz',

  // Frozen
  'digiorno pizza': 'frozen-pizza-digiorno',
  'frozen pizza': 'frozen-pizza-digiorno',
  'digiorno': 'frozen-pizza-digiorno',
  'frozen vegetables': 'frozen-vegetables-mixed-16oz',
  'frozen veggies': 'frozen-vegetables-mixed-16oz',
  'mixed vegetables frozen': 'frozen-vegetables-mixed-16oz',
  'frozen french fries': 'frozen-french-fries-32oz',
  'french fries': 'frozen-french-fries-32oz',
  'fries': 'frozen-french-fries-32oz',
  'chicken nuggets': 'frozen-chicken-nuggets-24oz',
  'frozen chicken nuggets': 'frozen-chicken-nuggets-24oz',
  'frozen waffles': 'frozen-waffles-10ct',
  'waffles': 'frozen-waffles-10ct',
  'ice cream': 'ice-cream-48oz',
  'frozen burritos': 'frozen-burritos-8ct',
  'frozen berries': 'frozen-berries-mixed-12oz',
  'frozen shrimp': 'frozen-shrimp-1lb',
  'ice cream sandwiches': 'ice-cream-sandwiches-6ct',
  'popsicles': 'popsicles-12ct',
  'frozen corn': 'frozen-corn-16oz',

  // Household
  'toilet paper': 'toilet-paper-12roll',
  'tp': 'toilet-paper-12roll',
  'bath tissue': 'toilet-paper-12roll',
  'paper towels': 'paper-towels-6roll',
  'laundry detergent': 'laundry-detergent-50oz',
  'detergent': 'laundry-detergent-50oz',
  'tide detergent': 'laundry-detergent-50oz',
  'dish soap': 'dish-soap-16oz',
  'dawn dish soap': 'dish-soap-16oz',
  'dishwashing liquid': 'dish-soap-16oz',
  'trash bags': 'trash-bags-30ct',
  'garbage bags': 'trash-bags-30ct',
  'aluminum foil': 'aluminum-foil-75sqft',
  'foil': 'aluminum-foil-75sqft',
  'plastic wrap': 'plastic-wrap-200sqft',
  'saran wrap': 'plastic-wrap-200sqft',
  'ziploc bags': 'ziploc-bags-gallon-20ct',
  'storage bags': 'ziploc-bags-gallon-20ct',
  'sponges': 'sponges-3ct',
  'all purpose cleaner': 'all-purpose-cleaner-32oz',
  'cleaner': 'all-purpose-cleaner-32oz',

  // Produce
  'bananas': 'bananas-per-lb',
  'banana': 'bananas-per-lb',
  'apples': 'apples-gala-per-lb',
  'gala apples': 'apples-gala-per-lb',
  'avocados': 'avocados-each',
  'avocado': 'avocados-each',
  'strawberries': 'strawberries-1lb',
  'blueberries': 'blueberries-6oz',
  'lemons': 'lemons-each',
  'lemon': 'lemons-each',
  'limes': 'limes-each',
  'lime': 'limes-each',
  'oranges': 'oranges-per-lb',
  'orange': 'oranges-per-lb',
  'red grapes': 'grapes-red-per-lb',
  'grapes': 'grapes-red-per-lb',
  'roma tomatoes': 'tomatoes-roma-per-lb',
  'tomatoes': 'tomatoes-roma-per-lb',
  'yellow onions': 'onions-yellow-per-lb',
  'onions': 'onions-yellow-per-lb',
  'onion': 'onions-yellow-per-lb',
  'russet potatoes': 'potatoes-russet-5lb',
  'potatoes': 'potatoes-russet-5lb',
  'baby spinach': 'baby-spinach-5oz',
  'spinach': 'baby-spinach-5oz',
  'romaine lettuce': 'romaine-lettuce-each',
  'lettuce': 'romaine-lettuce-each',
  'green bell pepper': 'bell-pepper-green-each',
  'green pepper': 'bell-pepper-green-each',
  'bell pepper': 'bell-pepper-green-each',
  'red bell pepper': 'bell-pepper-red-each',
  'red pepper': 'bell-pepper-red-each',
  'broccoli': 'broccoli-crown-per-lb',
  'broccoli crown': 'broccoli-crown-per-lb',
  'carrots': 'carrots-1lb-bag',
  'baby carrots': 'carrots-1lb-bag',
  'celery': 'celery-bunch',
  'cucumber': 'cucumber-each',
  'cucumbers': 'cucumber-each',
  'garlic': 'garlic-each',
  'ginger': 'ginger-root-per-lb',
  'ginger root': 'ginger-root-per-lb',
  'sweet potatoes': 'sweet-potatoes-per-lb',
  'sweet potato': 'sweet-potatoes-per-lb',
  'zucchini': 'zucchini-per-lb',
  'mushrooms': 'mushrooms-white-8oz',
  'white mushrooms': 'mushrooms-white-8oz',
  'corn on cob': 'corn-on-cob-each',
  'corn on the cob': 'corn-on-cob-each',
  'cilantro': 'cilantro-bunch',
  'jalapenos': 'jalapenos-per-lb',
  'jalapeno': 'jalapenos-per-lb',
  'watermelon': 'watermelon-each',
  'pineapple': 'pineapple-each',

  // Pantry
  'white rice': 'white-rice-5lb',
  'rice': 'white-rice-5lb',
  'brown rice': 'brown-rice-2lb',
  'spaghetti': 'pasta-spaghetti-16oz',
  'pasta': 'pasta-spaghetti-16oz',
  'penne': 'pasta-penne-16oz',
  'white bread': 'bread-white-loaf',
  'bread': 'bread-white-loaf',
  'wheat bread': 'bread-wheat-loaf',
  'flour': 'flour-all-purpose-5lb',
  'all purpose flour': 'flour-all-purpose-5lb',
  'sugar': 'sugar-granulated-4lb',
  'granulated sugar': 'sugar-granulated-4lb',
  'olive oil': 'olive-oil-16oz',
  'extra virgin olive oil': 'olive-oil-16oz',
  'vegetable oil': 'vegetable-oil-48oz',
  'peanut butter': 'peanut-butter-16oz',
  'jelly': 'jelly-grape-20oz',
  'grape jelly': 'jelly-grape-20oz',
  'cheerios': 'cereal-cheerios-18oz',
  'cereal': 'cereal-cheerios-18oz',
  'oatmeal': 'oatmeal-42oz',
  'diced tomatoes': 'canned-tomatoes-diced-14oz',
  'canned tomatoes': 'canned-tomatoes-diced-14oz',
  'black beans': 'canned-beans-black-15oz',
  'canned beans': 'canned-beans-black-15oz',
  'canned tuna': 'canned-tuna-5oz',
  'tuna': 'canned-tuna-5oz',
  'chicken broth': 'chicken-broth-32oz',
  'broth': 'chicken-broth-32oz',
  'ketchup': 'ketchup-20oz',
  'mustard': 'mustard-yellow-8oz',
  'yellow mustard': 'mustard-yellow-8oz',
  'mayo': 'mayo-30oz',
  'mayonnaise': 'mayo-30oz',
  'salt': 'salt-26oz',
  'black pepper': 'black-pepper-4oz',
  'pepper': 'black-pepper-4oz',
  'tortillas': 'tortillas-flour-10ct',
  'flour tortillas': 'tortillas-flour-10ct',
  'potato chips': 'chips-potato-8oz',
  'chips': 'chips-potato-8oz',
  'lays chips': 'chips-potato-8oz',
  'salsa': 'salsa-16oz',
  'saltine crackers': 'crackers-saltine-16oz',
  'crackers': 'crackers-saltine-16oz',
  'granola bars': 'granola-bars-6ct',
  'mac and cheese': 'mac-and-cheese-7oz',
  'mac & cheese': 'mac-and-cheese-7oz',
  'kraft mac': 'mac-and-cheese-7oz',
  'ramen': 'ramen-noodles-12pack',
  'ramen noodles': 'ramen-noodles-12pack',
  'pancake mix': 'pancake-mix-32oz',
  'syrup': 'syrup-24oz',
  'maple syrup': 'syrup-24oz',
  'pancake syrup': 'syrup-24oz',
  'honey': 'honey-12oz',
  'canned corn': 'canned-corn-15oz',
  'corn': 'canned-corn-15oz',
  'canned green beans': 'canned-green-beans-14oz',
  'green beans': 'canned-green-beans-14oz',
  'tomato sauce': 'tomato-sauce-8oz',
  'bbq sauce': 'bbq-sauce-18oz',
  'barbecue sauce': 'bbq-sauce-18oz',
  'soy sauce': 'soy-sauce-10oz',
  'hot sauce': 'hot-sauce-5oz',

  // Beverages
  'water bottles': 'water-bottles-24pack',
  'bottled water': 'water-bottles-24pack',
  'water 24pk': 'water-bottles-24pack',
  'coca cola': 'coca-cola-12pack',
  'coca-cola': 'coca-cola-12pack',
  'coke': 'coca-cola-12pack',
  'pepsi': 'pepsi-12pack',
  'orange juice': 'orange-juice-64oz',
  'oj': 'orange-juice-64oz',
  'apple juice': 'apple-juice-64oz',
  'coffee': 'coffee-ground-12oz',
  'ground coffee': 'coffee-ground-12oz',
  'maxwell house': 'coffee-ground-12oz',
  'folgers': 'coffee-ground-12oz',
  'k-cups': 'k-cups-12ct',
  'k cups': 'k-cups-12ct',
  'green tea': 'green-tea-bags-20ct',
  'tea bags': 'green-tea-bags-20ct',
  'tea': 'green-tea-bags-20ct',
  'gatorade': 'gatorade-8pack',
  'lacroix': 'lacroix-sparkling-12pack',
  'sparkling water': 'lacroix-sparkling-12pack',
  'red bull': 'red-bull-4pack',
  'energy drink': 'red-bull-4pack',
  'kombucha': 'kombucha-16oz',
  'lemonade': 'lemonade-64oz',

  // Snacks
  'oreos': 'oreos-14oz',
  'oreo cookies': 'oreos-14oz',
  'doritos': 'doritos-9oz',
  'pretzels': 'pretzels-16oz',
  'trail mix': 'trail-mix-16oz',
  'popcorn': 'popcorn-microwave-3ct',
  'microwave popcorn': 'popcorn-microwave-3ct',
  'goldfish': 'goldfish-crackers-6oz',
  'goldfish crackers': 'goldfish-crackers-6oz',
  'fruit snacks': 'fruit-snacks-10ct',
  'almonds': 'nuts-almonds-16oz',
  'mixed nuts': 'nuts-almonds-16oz',
  'chocolate bar': 'chocolate-bar-3oz',
  'chocolate': 'chocolate-bar-3oz',
  'hummus': 'hummus-10oz',
};

/**
 * Look up an alias; returns the grocery-prices.json item or null.
 */
function resolveAlias(rawName: string): GroceryItem | null {
  const key = rawName.toLowerCase().trim();
  const id = ITEM_ALIASES[key];
  if (!id) return null;
  return (groceryData.items as unknown as GroceryItem[]).find((i) => i.id === id) || null;
}

function formatDisplayName(name: string, unit?: string): string {
  if (!unit) return name;
  return `${name} (${unit})`;
}

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
  // 1. Try exact alias match first
  const aliasMatch = resolveAlias(name);
  if (aliasMatch) {
    return buildMatchedItem(aliasMatch, price, quantity);
  }

  // 2. Fall back to fuzzy search
  const results = fuse.search(name);

  if (results.length === 0) {
    return { name, price, quantity, status: 'similar' };
  }

  const matched = results[0].item as unknown as GroceryItem;
  return buildMatchedItem(matched, price, quantity);
}

function buildMatchedItem(
  matched: GroceryItem,
  price: number,
  quantity: number
): ReceiptItem {
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
    name: formatDisplayName(matched.name, matched.unit),
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
    { items: { name: string; price: number; yourPrice: number; unit?: string }[]; totalSavings: number }
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
  sourceStore: string = 'upload',
  receiptTotal?: number
): AnalysisResult {
  // OCR returns price as the line total (e.g. qty=2, price=$7.58 means $3.79 each).
  // Normalize to per-unit so all downstream math (which assumes per-unit) works correctly.
  const items = parsedItems.map((i) =>
    matchItem(i.name, i.quantity > 1 ? i.price / i.quantity : i.price, i.quantity)
  );

  // Use the actual receipt total if available (from Vision AI), otherwise compute from items.
  // This ensures totalSpent matches what the user actually paid on the receipt,
  // not the database-matched prices.
  const totalSpent = receiptTotal != null
    ? Number(receiptTotal.toFixed(2))
    : Number(
        parsedItems.reduce((s, i) => s + i.price, 0).toFixed(2)
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
