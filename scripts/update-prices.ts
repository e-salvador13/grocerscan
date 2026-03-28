#!/usr/bin/env npx tsx
/**
 * Update grocery-prices.json with real scraped Kroger data
 * and fix bogus Target prices.
 * 
 * Usage: npx tsx scripts/update-prices.ts
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRICES_FILE = path.join(DATA_DIR, 'grocery-prices.json');
const KROGER_FILE = path.join(DATA_DIR, 'kroger-prices.json');

// Manual mapping: grocery-prices item ID → search terms for Kroger products
const KROGER_MATCH: Record<string, { terms: string[]; prefer?: string; fallbackPrice?: number }> = {
  'bananas-per-lb': { terms: ['banana'], prefer: 'Fresh Bunch of Bananas' },
  'apples-gala-per-lb': { terms: ['gala apple'], prefer: 'Gala' },
  'avocados-each': { terms: ['avocado'], prefer: 'Hass Avocado' },
  'strawberries-1lb': { terms: ['strawberries'], prefer: 'Strawberries' },
  'blueberries-6oz': { terms: ['blueberries'], prefer: 'Blueberries' },
  'lemons-each': { terms: ['lemon'], prefer: 'Lemon' },
  'limes-each': { terms: ['lime'], prefer: 'Lime' },
  'oranges-per-lb': { terms: ['navel orange'], prefer: 'Navel' },
  'grapes-red-per-lb': { terms: ['red grapes'], prefer: 'Red Grapes' },
  'tomatoes-roma-per-lb': { terms: ['roma tomato'], prefer: 'Roma' },
  'potatoes-russet-5lb': { terms: ['russet potato', '5 lb'], prefer: 'Russet Potatoes' },
  'onions-yellow-per-lb': { terms: ['yellow onion'], prefer: 'Yellow Onion' },
  'garlic-each': { terms: ['garlic', 'bulb'], prefer: 'Fresh Garlic', fallbackPrice: 0.79 },
  'romaine-lettuce-each': { terms: ['romaine'], prefer: 'Romaine Hearts' },
  'baby-spinach-5oz': { terms: ['baby spinach'], prefer: 'Baby Spinach' },
  'broccoli-crown-per-lb': { terms: ['broccoli crown'], prefer: 'Broccoli' },
  'carrots-1lb-bag': { terms: ['carrots', 'bag'], prefer: 'Carrots' },
  'bell-pepper-red-each': { terms: ['red bell pepper'], prefer: 'Red Bell' },
  'bell-pepper-green-each': { terms: ['green bell pepper'], prefer: 'Green Bell' },
  'cucumber-each': { terms: ['cucumber'], prefer: 'Cucumber' },
  'sweet-potatoes-per-lb': { terms: ['sweet potato'], prefer: 'Sweet Potato' },
  'mushrooms-white-8oz': { terms: ['mushroom', 'white'], prefer: 'White Mushrooms' },
  'cauliflower-each': { terms: ['cauliflower'], prefer: 'Cauliflower' },
  'whole-milk-gallon': { terms: ['whole milk', 'gallon'], prefer: 'Whole Milk' },
  '2pct-milk-gallon': { terms: ['2% milk', 'gallon'], prefer: '2% Milk' },
  'large-eggs-dozen': { terms: ['large eggs', 'dozen'], prefer: 'Large Eggs' },
  'butter-unsalted-1lb': { terms: ['unsalted butter'], prefer: 'Unsalted Butter' },
  'shredded-cheddar-8oz': { terms: ['shredded cheddar'], prefer: 'Shredded' },
  'cream-cheese-8oz': { terms: ['cream cheese', '8 oz'], prefer: 'Cream Cheese' },
  'heavy-cream-16oz': { terms: ['heavy cream', 'whipping'], prefer: 'Heavy' },
  'greek-yogurt-plain-32oz': { terms: ['greek yogurt', 'plain'], prefer: 'Plain' },
  'sour-cream-16oz': { terms: ['sour cream'], prefer: 'Sour Cream' },
  'cottage-cheese-16oz': { terms: ['cottage cheese'], prefer: 'Cottage Cheese' },
  'oat-milk-64oz': { terms: ['oat milk'], prefer: 'Oat Milk' },
  'almond-milk-64oz': { terms: ['almond milk'], prefer: 'Almond' },
  'chicken-breast-boneless-per-lb': { terms: ['boneless chicken breast'], prefer: 'Boneless' },
  'ground-beef-80-20-per-lb': { terms: ['ground beef', '80%'], prefer: '80/20' },
  'ground-turkey-per-lb': { terms: ['ground turkey'], prefer: 'Ground Turkey' },
  'salmon-fillet-per-lb': { terms: ['salmon', 'atlantic'], prefer: 'Atlantic Salmon' },
  'bacon-16oz': { terms: ['bacon', '16 oz'], prefer: 'Bacon' },
  'hot-dogs-8ct': { terms: ['hot dogs'], prefer: 'Hot Dogs' },
  'italian-sausage-per-lb': { terms: ['italian sausage'], prefer: 'Italian Sausage' },
  'bread-white-loaf': { terms: ['white bread', 'loaf'], prefer: 'White Bread', fallbackPrice: 2.49 },
  'pasta-spaghetti-16oz': { terms: ['spaghetti', '16 oz'], prefer: 'Spaghetti' },
  'cereal-cheerios-18oz': { terms: ['cheerios'], prefer: 'Cheerios' },
  'peanut-butter-16oz': { terms: ['peanut butter'], prefer: 'Peanut Butter' },
  'canned-beans-black-15oz': { terms: ['black beans', 'can'], prefer: 'Black Beans' },
  'tomato-sauce-8oz': { terms: ['tomato sauce', '8 oz'], prefer: 'Tomato Sauce' },
  'white-rice-5lb': { terms: ['white rice', '5 lb'], prefer: 'White Rice' },
  'chicken-broth-32oz': { terms: ['chicken broth', '32'], prefer: 'Chicken Broth' },
  'olive-oil-16oz': { terms: ['olive oil'], prefer: 'Extra Virgin' },
  'soy-sauce-10oz': { terms: ['soy sauce'], prefer: 'Soy Sauce' },
  'honey-12oz': { terms: ['honey'], prefer: 'Honey' },
  'oatmeal-42oz': { terms: ['oats', 'old fashioned'], prefer: 'Old Fashioned' },
  'coffee-ground-12oz': { terms: ['ground coffee', '12 oz'], prefer: 'Ground Coffee' },
  'orange-juice-64oz': { terms: ['orange juice', '64'], prefer: 'Orange Juice' },
  'water-bottles-24pack': { terms: ['water', '24 pack'], prefer: '24 Pack' },
  'coca-cola-12pack': { terms: ['coca-cola', '12 pack'], prefer: 'Coca-Cola' },
  'frozen-pizza-digiorno': { terms: ['digiorno'], prefer: 'DiGiorno' },
  'frozen-vegetables-mixed-16oz': { terms: ['frozen vegetables', 'mixed'], prefer: 'Mixed Vegetables' },
  'ice-cream-48oz': { terms: ['ice cream', '48'], prefer: 'Ice Cream' },
  'paper-towels-6roll': { terms: ['paper towels'], prefer: 'Paper Towels', fallbackPrice: 6.99 },
  'toilet-paper-12roll': { terms: ['toilet paper'], prefer: 'Toilet Paper', fallbackPrice: 7.99 },
  'dish-soap-16oz': { terms: ['dish soap'], prefer: 'Dish Soap', fallbackPrice: 3.49 },
  'trash-bags-30ct': { terms: ['trash bags'], prefer: 'Trash Bags', fallbackPrice: 6.99 },
  'laundry-detergent-50oz': { terms: ['laundry detergent'], prefer: 'Laundry', fallbackPrice: 6.99 },
  'granola-bars-6ct': { terms: ['granola bar'], prefer: 'Granola' },
  'nuts-almonds-16oz': { terms: ['almonds'], prefer: 'Almonds' },
  'trail-mix-16oz': { terms: ['trail mix'], prefer: 'Trail Mix' },
};

// Reasonable Target prices (fixing the $0.39 bug)
// Based on Target.com typical pricing
const TARGET_FIXES: Record<string, number> = {
  'bananas-per-lb': 0.25,
  'apples-gala-per-lb': 1.59,
  'blueberries-6oz': 3.29,
  'oranges-per-lb': 1.39,
  'grapes-red-per-lb': 2.29,
  'lemons-each': 0.69,
  'limes-each': 0.39,
  'strawberries-1lb': 2.99,
  'avocados-each': 1.19,
  'tomatoes-roma-per-lb': 1.49,
  'potatoes-russet-5lb': 4.29,
  'onions-yellow-per-lb': 1.29,
  'carrots-1lb-bag': 1.19,
  'baby-spinach-5oz': 2.99,
  'bell-pepper-red-each': 1.29,
  'bell-pepper-green-each': 0.99,
  'cucumber-each': 0.89,
  'sweet-potatoes-per-lb': 1.49,
  'mushrooms-white-8oz': 2.29,
  'cauliflower-each': 2.99,
  'romaine-lettuce-each': 2.29,
  'broccoli-crown-per-lb': 2.19,
  'garlic-each': 0.69,
};

function findKrogerPrice(itemId: string, krogerProducts: any[]): number | null {
  const mapping = KROGER_MATCH[itemId];
  if (!mapping) return null;

  // Filter products that match ALL search terms
  let matches = krogerProducts.filter(p => {
    const name = (p.name || '').toLowerCase();
    return mapping.terms.every(t => name.includes(t.toLowerCase()));
  });

  if (matches.length === 0) {
    // Try matching just the first term
    matches = krogerProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      return name.includes(mapping.terms[0].toLowerCase());
    });
  }

  if (matches.length === 0) return null;

  // Prefer products matching the prefer string
  if (mapping.prefer) {
    const preferred = matches.filter(p =>
      (p.name || '').toLowerCase().includes(mapping.prefer!.toLowerCase())
    );
    if (preferred.length > 0) matches = preferred;
  }

  // Filter out obviously wrong prices (bulk, multi-packs, etc.)
  const reasonable = matches.filter(p => p.price > 0 && p.price < 30);
  if (reasonable.length === 0) return null;

  // Return the lower-quartile price (store brand / basic version)
  // This avoids picking premium/bulk options
  reasonable.sort((a: any, b: any) => a.price - b.price);
  const q1 = Math.floor(reasonable.length * 0.25);
  return reasonable[q1].price;
}

async function main() {
  console.log('📊 Updating grocery-prices.json with real data...\n');

  const pricesData = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf-8'));
  let krogerProducts: any[] = [];

  if (fs.existsSync(KROGER_FILE)) {
    const krogerData = JSON.parse(fs.readFileSync(KROGER_FILE, 'utf-8'));
    krogerProducts = krogerData.products || [];
    console.log(`✅ Loaded ${krogerProducts.length} Kroger products (scraped: ${krogerData.scraped_at})`);
  } else {
    console.log('⚠️  No Kroger scraped data found, skipping Kroger updates');
  }

  let krogerUpdates = 0;
  let targetFixes = 0;

  for (const item of pricesData.items) {
    // Update Kroger prices from scraped data
    if (krogerProducts.length > 0) {
      let realPrice = findKrogerPrice(item.id, krogerProducts);
      const mapping = KROGER_MATCH[item.id];
      
      // If scraped price seems unreasonable and we have a fallback, use it
      if (mapping?.fallbackPrice && realPrice !== null && realPrice > mapping.fallbackPrice * 2) {
        console.log(`  ⚠️  Kroger: ${item.name}: scraped $${realPrice} too high, using fallback $${mapping.fallbackPrice}`);
        realPrice = mapping.fallbackPrice;
      }
      
      if (realPrice !== null) {
        const oldPrice = item.prices.kroger?.price;
        item.prices.kroger.price = realPrice;
        if (oldPrice !== realPrice) {
          console.log(`  🔄 Kroger: ${item.name}: $${oldPrice} → $${realPrice}`);
          krogerUpdates++;
        }
      }
    }

    // Fix bogus Target prices
    if (item.prices.target?.price === 0.39 && TARGET_FIXES[item.id]) {
      const oldPrice = item.prices.target.price;
      item.prices.target.price = TARGET_FIXES[item.id];
      console.log(`  🔧 Target: ${item.name}: $${oldPrice} → $${TARGET_FIXES[item.id]}`);
      targetFixes++;
    }
  }

  // Add metadata
  pricesData.lastUpdated = new Date().toISOString();
  pricesData.sources = {
    kroger: { method: 'api', lastScraped: fs.existsSync(KROGER_FILE) 
      ? JSON.parse(fs.readFileSync(KROGER_FILE, 'utf-8')).scraped_at 
      : null },
    walmart: { method: 'manual', note: 'Walmart.com prices' },
    target: { method: 'estimated', note: 'Some prices estimated from Target.com' },
    whole_foods: { method: 'manual', note: 'Whole Foods Market typical pricing' },
    aldi: { method: 'manual', note: 'Aldi.us weekly prices' },
    lidl: { method: 'manual', note: 'Lidl.com weekly prices' },
  };

  fs.writeFileSync(PRICES_FILE, JSON.stringify(pricesData, null, 2));

  console.log(`\n✅ Done!`);
  console.log(`   Kroger prices updated: ${krogerUpdates}`);
  console.log(`   Target prices fixed: ${targetFixes}`);
  console.log(`   Saved to: ${PRICES_FILE}`);
}

main().catch(console.error);
