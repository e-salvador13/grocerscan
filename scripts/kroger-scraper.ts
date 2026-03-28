#!/usr/bin/env npx tsx
/**
 * Kroger Grocery Price Scraper
 *
 * Pulls real grocery prices from Kroger's public API and saves them
 * in a format compatible with the GrocerScan price database.
 *
 * Usage:
 *   npm run scrape:kroger
 *
 * Required env vars (or .env file):
 *   KROGER_CLIENT_ID
 *   KROGER_CLIENT_SECRET
 *   KROGER_ZIP_CODE (default: 23220)
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config & Types
// ---------------------------------------------------------------------------

const API_BASE = "https://api.kroger.com/v1";
const TOKEN_URL = `${API_BASE}/connect/oauth2/token`;
const PRODUCTS_URL = `${API_BASE}/products`;
const LOCATIONS_URL = `${API_BASE}/locations`;

const RATE_LIMIT_MS = 750; // ms between API requests

interface KrogerToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface KrogerLocation {
  locationId: string;
  chain: string;
  name: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface KrogerProductPrice {
  regular?: number;
  promo?: number;
}

interface KrogerProductItem {
  itemId: string;
  price?: KrogerProductPrice;
  size?: string;
}

interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  categories: string[];
  items: KrogerProductItem[];
}

interface ScrapedProduct {
  productId: string;
  upc: string;
  name: string;
  brand: string;
  category: string;
  searchTerm: string;
  searchCategory: string;
  price: number | null;
  promoPrice: number | null;
  size: string | null;
}

interface KrogerPricesOutput {
  scraped_at: string;
  store: {
    locationId: string;
    name: string;
    address: string;
    chain: string;
  };
  total_products: number;
  categories: Record<string, number>;
  products: ScrapedProduct[];
}

// ---------------------------------------------------------------------------
// Search terms by category
// ---------------------------------------------------------------------------

const SEARCH_TERMS: Record<string, string[]> = {
  produce: [
    "bananas", "apples", "oranges", "strawberries", "blueberries",
    "grapes", "lemons", "limes", "avocado", "tomatoes",
    "potatoes", "onions", "garlic", "lettuce", "spinach",
    "kale", "broccoli", "carrots", "celery", "cucumber",
    "bell pepper", "mushrooms", "corn", "green beans", "zucchini",
    "sweet potato", "cabbage", "cauliflower",
  ],
  dairy_eggs: [
    "milk", "eggs", "butter", "cheese", "yogurt",
    "cream cheese", "sour cream", "heavy cream", "half and half",
    "cottage cheese", "shredded cheese", "american cheese", "string cheese",
  ],
  meat_seafood: [
    "chicken breast", "ground beef", "chicken thighs", "pork chops",
    "bacon", "sausage", "steak", "ground turkey", "deli turkey",
    "deli ham", "hot dogs", "salmon", "shrimp", "tilapia",
  ],
  bakery: [
    "bread", "bagels", "tortillas", "hamburger buns",
    "english muffins", "croissants", "dinner rolls",
  ],
  pantry: [
    "rice", "pasta", "cereal", "oatmeal", "peanut butter",
    "jelly", "canned beans", "canned corn", "canned tomatoes",
    "tomato sauce", "pasta sauce", "chicken broth", "olive oil",
    "vegetable oil", "flour", "sugar", "salt", "pepper",
    "ketchup", "mustard", "mayo", "soy sauce", "vinegar",
    "honey", "syrup", "pancake mix",
  ],
  frozen: [
    "frozen pizza", "ice cream", "frozen vegetables", "frozen fruit",
    "frozen chicken nuggets", "frozen fries", "frozen waffles",
  ],
  beverages: [
    "water", "soda", "juice", "coffee", "tea",
    "energy drink", "sports drink", "almond milk", "oat milk",
  ],
  snacks: [
    "chips", "crackers", "cookies", "granola bars",
    "popcorn", "nuts", "trail mix", "pretzels",
  ],
  household: [
    "paper towels", "toilet paper", "dish soap", "laundry detergent",
    "trash bags", "aluminum foil", "plastic wrap", "napkins", "sponges",
  ],
  personal_care: [
    "shampoo", "conditioner", "body wash", "toothpaste", "deodorant",
  ],
};

// ---------------------------------------------------------------------------
// Load .env (simple implementation — no dependency needed)
// ---------------------------------------------------------------------------

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] ❌ ${msg}`);
}

// ---------------------------------------------------------------------------
// Kroger API
// ---------------------------------------------------------------------------

async function getAuthToken(clientId: string, clientSecret: string): Promise<string> {
  log("Authenticating with Kroger API...");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as KrogerToken;
  log(`✅ Authenticated (token expires in ${data.expires_in}s)`);
  return data.access_token;
}

async function findNearestStore(token: string, zipCode: string): Promise<KrogerLocation> {
  log(`Searching for nearest Kroger store to ZIP ${zipCode}...`);

  const url = `${LOCATIONS_URL}?filter.zipCode.near=${zipCode}&filter.radiusInMiles=10&filter.limit=5`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Location search failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { data: KrogerLocation[] };

  if (!data.data || data.data.length === 0) {
    throw new Error(`No Kroger stores found near ZIP ${zipCode}`);
  }

  const store = data.data[0];
  log(
    `✅ Found store: ${store.name} (${store.chain}) — ${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`
  );
  log(`   Location ID: ${store.locationId}`);

  return store;
}

async function searchProducts(
  token: string,
  locationId: string,
  searchTerm: string
): Promise<KrogerProduct[]> {
  const url = `${PRODUCTS_URL}?filter.term=${encodeURIComponent(searchTerm)}&filter.locationId=${locationId}&filter.limit=10`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (response.status === 429) {
    log(`⚠️  Rate limited on "${searchTerm}" — waiting 5s and retrying...`);
    await sleep(5000);
    return searchProducts(token, locationId, searchTerm);
  }

  if (!response.ok) {
    const text = await response.text();
    logError(`Product search for "${searchTerm}" failed (${response.status}): ${text}`);
    return [];
  }

  const data = (await response.json()) as { data: KrogerProduct[] };
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

function extractProducts(
  products: KrogerProduct[],
  searchTerm: string,
  searchCategory: string
): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];

  for (const product of products) {
    // Get best price from items array
    let bestPrice: number | null = null;
    let promoPrice: number | null = null;
    let size: string | null = null;

    for (const item of product.items || []) {
      if (item.price?.regular != null) {
        if (bestPrice === null || item.price.regular < bestPrice) {
          bestPrice = item.price.regular;
          promoPrice = item.price.promo ?? null;
          size = item.size ?? null;
        }
      }
    }

    // Skip products without any price
    if (bestPrice === null) continue;

    results.push({
      productId: product.productId,
      upc: product.upc,
      name: product.description,
      brand: product.brand,
      category: searchCategory,
      searchTerm,
      searchCategory,
      price: bestPrice,
      promoPrice,
      size,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Merge logic: update grocery-prices.json with real Kroger data
// ---------------------------------------------------------------------------

interface GroceryPriceItem {
  id: string;
  name: string;
  category: string;
  unit?: string;
  size?: string;
  prices: Record<string, { price: number; estimated?: boolean; source?: string }>;
  [key: string]: unknown;
}

interface GroceryPricesFile {
  items: GroceryPriceItem[];
  [key: string]: unknown;
}

/**
 * Mapping from grocery-prices.json item IDs to Kroger search terms.
 * This allows the merge script to match scraped data to existing items.
 */
const ID_TO_SEARCH_TERMS: Record<string, string[]> = {
  // Produce
  "bananas-per-lb": ["bananas"],
  "apples-gala-per-lb": ["apples"],
  "avocados-each": ["avocado"],
  "strawberries-1lb": ["strawberries"],
  "blueberries-6oz": ["blueberries"],
  "lemons-each": ["lemons"],
  "limes-each": ["limes"],
  "oranges-per-lb": ["oranges"],
  "grapes-red-per-lb": ["grapes"],
  "tomatoes-roma-per-lb": ["tomatoes"],
  "onions-yellow-per-lb": ["onions"],
  "potatoes-russet-5lb": ["potatoes"],
  "baby-spinach-5oz": ["spinach"],
  "romaine-lettuce-each": ["lettuce"],
  "bell-pepper-green-each": ["bell pepper"],
  "bell-pepper-red-each": ["bell pepper"],
  "broccoli-crown-per-lb": ["broccoli"],
  "carrots-1lb-bag": ["carrots"],
  "celery-bunch": ["celery"],
  "cucumber-each": ["cucumber"],
  "garlic-each": ["garlic"],
  "sweet-potatoes-per-lb": ["sweet potato"],
  "zucchini-per-lb": ["zucchini"],
  "mushrooms-white-8oz": ["mushrooms"],
  "corn-on-cob-each": ["corn"],
  "cabbage-per-lb": ["cabbage"],
  "cauliflower-each": ["cauliflower"],
  // Dairy
  "whole-milk-gallon": ["milk"],
  "2pct-milk-gallon": ["milk"],
  "almond-milk-64oz": ["almond milk"],
  "oat-milk-64oz": ["oat milk"],
  "large-eggs-dozen": ["eggs"],
  "butter-unsalted-1lb": ["butter"],
  "cream-cheese-8oz": ["cream cheese"],
  "shredded-cheddar-8oz": ["shredded cheese"],
  "sliced-american-cheese-12ct": ["american cheese"],
  "greek-yogurt-plain-32oz": ["yogurt"],
  "yogurt-cups-4pack": ["yogurt"],
  "sour-cream-16oz": ["sour cream"],
  "heavy-cream-16oz": ["heavy cream"],
  "half-and-half-32oz": ["half and half"],
  "cottage-cheese-16oz": ["cottage cheese"],
  // Meat
  "chicken-breast-boneless-per-lb": ["chicken breast"],
  "chicken-thighs-per-lb": ["chicken thighs"],
  "ground-beef-80-20-per-lb": ["ground beef"],
  "ground-turkey-per-lb": ["ground turkey"],
  "bacon-16oz": ["bacon"],
  "pork-chops-per-lb": ["pork chops"],
  "salmon-fillet-per-lb": ["salmon"],
  "shrimp-raw-1lb": ["shrimp"],
  "tilapia-fillet-per-lb": ["tilapia"],
  "hot-dogs-8ct": ["hot dogs"],
  "deli-turkey-per-lb": ["deli turkey"],
  "deli-ham-per-lb": ["deli ham"],
  "italian-sausage-per-lb": ["sausage"],
  "steak-ribeye-per-lb": ["steak"],
  // Beverages
  "water-bottles-24pack": ["water"],
  "coca-cola-12pack": ["soda"],
  "orange-juice-64oz": ["juice"],
  "coffee-ground-12oz": ["coffee"],
  "green-tea-bags-20ct": ["tea"],
  "gatorade-8pack": ["sports drink"],
  "red-bull-4pack": ["energy drink"],
  // Pantry
  "white-rice-5lb": ["rice"],
  "pasta-spaghetti-16oz": ["pasta"],
  "bread-white-loaf": ["bread"],
  "bread-wheat-loaf": ["bread"],
  "flour-all-purpose-5lb": ["flour"],
  "sugar-granulated-4lb": ["sugar"],
  "olive-oil-16oz": ["olive oil"],
  "vegetable-oil-48oz": ["vegetable oil"],
  "peanut-butter-16oz": ["peanut butter"],
  "jelly-grape-20oz": ["jelly"],
  "cereal-cheerios-18oz": ["cereal"],
  "oatmeal-42oz": ["oatmeal"],
  "canned-tomatoes-diced-14oz": ["canned tomatoes"],
  "canned-beans-black-15oz": ["canned beans"],
  "chicken-broth-32oz": ["chicken broth"],
  "ketchup-20oz": ["ketchup"],
  "mustard-yellow-8oz": ["mustard"],
  "mayo-30oz": ["mayo"],
  "salt-26oz": ["salt"],
  "black-pepper-4oz": ["pepper"],
  "tortillas-flour-10ct": ["tortillas"],
  "canned-corn-15oz": ["canned corn"],
  "tomato-sauce-8oz": ["tomato sauce"],
  "soy-sauce-10oz": ["soy sauce"],
  "honey-12oz": ["honey"],
  "syrup-24oz": ["syrup"],
  "pancake-mix-32oz": ["pancake mix"],
  // Frozen
  "frozen-pizza-digiorno": ["frozen pizza"],
  "ice-cream-48oz": ["ice cream"],
  "frozen-vegetables-mixed-16oz": ["frozen vegetables"],
  "frozen-french-fries-32oz": ["frozen fries"],
  "frozen-chicken-nuggets-24oz": ["frozen chicken nuggets"],
  "frozen-waffles-10ct": ["frozen waffles"],
  "frozen-berries-mixed-12oz": ["frozen fruit"],
  // Snacks
  "chips-potato-8oz": ["chips"],
  "crackers-saltine-16oz": ["crackers"],
  "granola-bars-6ct": ["granola bars"],
  "pretzels-16oz": ["pretzels"],
  "trail-mix-16oz": ["trail mix"],
  "popcorn-microwave-3ct": ["popcorn"],
  "nuts-almonds-16oz": ["nuts"],
  "oreos-14oz": ["cookies"],
  // Household
  "paper-towels-6roll": ["paper towels"],
  "toilet-paper-12roll": ["toilet paper"],
  "dish-soap-16oz": ["dish soap"],
  "laundry-detergent-50oz": ["laundry detergent"],
  "trash-bags-30ct": ["trash bags"],
  "aluminum-foil-75sqft": ["aluminum foil"],
  "plastic-wrap-200sqft": ["plastic wrap"],
  "sponges-3ct": ["sponges"],
};

function mergeKrogerPrices(scrapedProducts: ScrapedProduct[]): void {
  const groceryPricesPath = path.resolve(process.cwd(), "data", "grocery-prices.json");

  if (!fs.existsSync(groceryPricesPath)) {
    log("⚠️  grocery-prices.json not found, skipping merge");
    return;
  }

  const groceryPrices: GroceryPricesFile = JSON.parse(
    fs.readFileSync(groceryPricesPath, "utf-8")
  );

  // Build a map: searchTerm -> best (cheapest) scraped product
  const termMap = new Map<string, ScrapedProduct>();
  for (const product of scrapedProducts) {
    const existing = termMap.get(product.searchTerm);
    if (!existing || (product.price != null && (existing.price == null || product.price < existing.price))) {
      termMap.set(product.searchTerm, product);
    }
  }

  let updated = 0;
  const now = new Date().toISOString().slice(0, 10);

  for (const item of groceryPrices.items) {
    const searchTerms = ID_TO_SEARCH_TERMS[item.id];
    if (!searchTerms) continue;

    for (const term of searchTerms) {
      const scraped = termMap.get(term);
      if (scraped && scraped.price != null) {
        item.prices.kroger = {
          price: scraped.price,
          estimated: false,
          source: `Kroger API ${now} — ${scraped.name}`,
        };
        updated++;
        break; // Use first matching term
      }
    }
  }

  // Write back
  fs.writeFileSync(groceryPricesPath, JSON.stringify(groceryPrices, null, 2) + "\n");
  log(`✅ Merged ${updated} Kroger prices into grocery-prices.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();

  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  const zipCode = process.env.KROGER_ZIP_CODE || "23220";

  if (!clientId || !clientSecret) {
    console.error(`
╔════════════════════════════════════════════════════╗
║  Missing Kroger API credentials!                   ║
║                                                    ║
║  Set these environment variables:                  ║
║    KROGER_CLIENT_ID=your_client_id                 ║
║    KROGER_CLIENT_SECRET=your_client_secret          ║
║                                                    ║
║  Or create a .env file. See .env.example           ║
║                                                    ║
║  Get credentials at:                               ║
║    https://developer.kroger.com                    ║
╚════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  console.log(`
┌──────────────────────────────────────────┐
│  🛒 Kroger Grocery Price Scraper         │
│  GrocerScan — Real Price Data Pipeline   │
└──────────────────────────────────────────┘
`);

  // Step 1: Authenticate
  let token: string;
  try {
    token = await getAuthToken(clientId, clientSecret);
  } catch (err) {
    logError(`Authentication failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // Step 2: Find nearest store
  let store: KrogerLocation;
  try {
    store = await findNearestStore(token, zipCode);
  } catch (err) {
    logError(`Store search failed: ${(err as Error).message}`);
    process.exit(1);
  }

  await sleep(RATE_LIMIT_MS);

  // Step 3: Search products by category
  const allProducts: ScrapedProduct[] = [];
  const categoryCounts: Record<string, number> = {};
  const totalTerms = Object.values(SEARCH_TERMS).reduce((sum, terms) => sum + terms.length, 0);
  let completedTerms = 0;

  for (const [category, terms] of Object.entries(SEARCH_TERMS)) {
    log(`\n📦 Category: ${category.toUpperCase()} (${terms.length} terms)`);
    let categoryCount = 0;

    for (const term of terms) {
      completedTerms++;
      const progress = `[${completedTerms}/${totalTerms}]`;

      try {
        const products = await searchProducts(token, store.locationId, term);
        const extracted = extractProducts(products, term, category);
        allProducts.push(...extracted);
        categoryCount += extracted.length;

        const priceRange =
          extracted.length > 0
            ? `$${Math.min(...extracted.map((p) => p.price!)).toFixed(2)} - $${Math.max(...extracted.map((p) => p.price!)).toFixed(2)}`
            : "no prices";

        log(`  ${progress} "${term}" → ${extracted.length} products (${priceRange})`);
      } catch (err) {
        logError(`  ${progress} "${term}" failed: ${(err as Error).message}`);
      }

      await sleep(RATE_LIMIT_MS);
    }

    categoryCounts[category] = categoryCount;
    log(`  ✅ ${category}: ${categoryCount} products`);
  }

  // Step 4: Save raw Kroger data
  const outputDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output: KrogerPricesOutput = {
    scraped_at: new Date().toISOString(),
    store: {
      locationId: store.locationId,
      name: store.name,
      address: `${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`,
      chain: store.chain,
    },
    total_products: allProducts.length,
    categories: categoryCounts,
    products: allProducts,
  };

  const outputPath = path.resolve(outputDir, "kroger-prices.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  log(`\n💾 Saved ${allProducts.length} products to ${outputPath}`);

  // Step 5: Merge into grocery-prices.json
  log("\n🔄 Merging into grocery-prices.json...");
  mergeKrogerPrices(allProducts);

  // Summary
  console.log(`
┌──────────────────────────────────────────┐
│  ✅ Scraping Complete!                    │
├──────────────────────────────────────────┤
│  Store: ${(store.name || "").padEnd(32)}│
│  Total products: ${String(allProducts.length).padEnd(23)}│
│  Categories:                             │`);

  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`│    ${cat.padEnd(20)} ${String(count).padStart(4)} products   │`);
  }

  console.log(`├──────────────────────────────────────────┤
│  Output: data/kroger-prices.json         │
│  Merged: data/grocery-prices.json        │
└──────────────────────────────────────────┘`);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  process.exit(1);
});
