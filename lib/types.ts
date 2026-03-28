export interface StorePrice {
  price: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  prices: Record<string, StorePrice>;
}

export interface GroceryDatabase {
  stores: string[];
  items: GroceryItem[];
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  matchedItem?: GroceryItem;
  bestStore?: string;
  bestPrice?: number;
  savings?: number;
  status: 'overcharged' | 'deal' | 'similar';
}

export interface CategoryBreakdown {
  category: string;
  itemCount: number;
  yourTotal: number;
  bestTotal: number;
  variance: number;
}

export interface OptimalStoreAllocation {
  store: string;
  items: { name: string; price: number; yourPrice: number }[];
  totalSavings: number;
}

export interface AnalysisResult {
  id: string;
  sourceStore: string;
  date: string;
  totalSpent: number;
  bestAlternativeTotal: number;
  savingsOpportunity: number;
  items: ReceiptItem[];
  categoryBreakdown: CategoryBreakdown[];
  optimalBasket: OptimalStoreAllocation[];
  totalOptimalSavings: number;
}

export const STORE_COLORS: Record<string, { primary: string; accent?: string; name: string }> = {
  walmart: { primary: '#0071CE', name: 'Walmart' },
  kroger: { primary: '#E31837', name: 'Kroger' },
  target: { primary: '#CC0000', name: 'Target' },
  whole_foods: { primary: '#00674B', name: 'Whole Foods' },
  aldi: { primary: '#00005F', accent: '#FF6600', name: 'Aldi' },
  lidl: { primary: '#0050AA', accent: '#FFE500', name: 'Lidl' },
};

export const STORE_NAMES: Record<string, string> = {
  walmart: 'Walmart',
  kroger: 'Kroger',
  target: 'Target',
  whole_foods: 'Whole Foods',
  aldi: 'Aldi',
  lidl: 'Lidl',
};

export const CATEGORY_DISPLAY: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  dairy_eggs: 'Dairy & Eggs',
  meat: 'Meat',
  meat_seafood: 'Meat & Seafood',
  pantry: 'Pantry',
  beverages: 'Beverages',
  frozen: 'Frozen',
  household: 'Household',
  snacks: 'Snacks',
};

export const CATEGORY_ICONS: Record<string, string> = {
  produce: '🥬',
  dairy: '🥛',
  dairy_eggs: '🥛',
  meat: '🥩',
  meat_seafood: '🥩',
  pantry: '🏪',
  beverages: '🥤',
  frozen: '🧊',
  household: '🧹',
  snacks: '🍪',
};
