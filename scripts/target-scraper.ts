#!/usr/bin/env npx tsx
/**
 * Target Grocery Price Scraper
 *
 * Pulls real grocery prices from Target's Redsky API and saves them
 * in a format compatible with the GrocerScan price database.
 *
 * Usage:
 *   npm run scrape:target
 *
 * No API credentials needed — Target's Redsky API uses a public key.
 * ZIP code: 23220 (Richmond, VA)
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config & Types
// ---------------------------------------------------------------------------

const REDSKY_BASE = "https://redsky.target.com/redsky_aggregations/v1/web";
const SEARCH_URL = `${REDSKY_BASE}/plp_search_v2`;
const STORE_URL = `${REDSKY_BASE}/store_location_v1`;

const RATE_LIMIT_MS = 1500; // 1.5s between API requests — be respectful
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Known Target API key (public, embedded in target.com JS bundles)
const DEFAULT_API_KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96";
const DEFAULT_ZIP_CODE = "23220"; // Richmond, VA
const DEFAULT_STORE_ID = "3230"; // Richmond area Target

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface TargetProduct {
  tcin: string;
  item: {
    product_description?: {
      title?: string;
      downstream_description?: string;
    };
    enrichment?: {
      buy_url?: string;
      images?: {
        primary_image_url?: string;
      };
    };
    product_classification?: {
      product_type_name?: string;
      merchandise_type_attributes?: Array<{ id: string; name: string }>;
    };
    fulfillment?: Record<string, unknown>;
  };
  price?: {
    formatted_current_price?: string;
    formatted_current_price_type?: string;
    current_retail?: number;
    current_retail_min?: number;
    reg_retail?: number;
    is_current_price_range?: boolean;
  };
}

interface TargetSearchResponse {
  data?: {
    search?: {
      products?: TargetProduct[];
      search_response?: {
        typed_metadata?: {
          total_results?: number;
        };
      };
    };
  };
}

interface ScrapedProduct {
  tcin: string;
  name: string;
  searchTerm: string;
  searchCategory: string;
  price: number | null;
  promoPrice: number | null;
  regPrice: number | null;
  size: string | null;
  url: string | null;
}

interface TargetPricesOutput {
  scraped_at: string;
  store: {
    storeId: string;
    zipCode: string;
    chain: string;
  };
  total_products: number;
  categories: Record<string, number>;
  products: ScrapedProduct[];
}

interface TargetStoreResponse {
  data?: {
    nearby_stores?: Array<{
      store_id: string;
      store_name: string;
      address?: {
        address_line1: string;
        city: string;
        state: string;
        postal_code: string;
      };
    }>;
  };
}

// ---------------------------------------------------------------------------
// Search terms by category (EXACT same as Kroger scraper)
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
// ID_TO_SEARCH_TERMS mapping (EXACT same as Kroger scraper)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Load .env
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

function getRequestHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": USER_AGENT,
    Referer: "https://www.target.com/",
    Origin: "https://www.target.com",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
}

// ---------------------------------------------------------------------------
// Target Redsky API
// ---------------------------------------------------------------------------

/**
 * Attempt to fetch a fresh API key from target.com HTML/JS.
 * Falls back to the well-known default key.
 */
async function getApiKey(): Promise<string> {
  log("Attempting to fetch fresh API key from target.com...");

  try {
    const response = await fetch("https://www.target.com", {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (response.ok) {
      const html = await response.text();

      // Look for the API key pattern in page source
      // It's typically in a JS bundle or inline script as an apiKey parameter
      const keyPatterns = [
        /["']apiKey["']\s*:\s*["']([a-f0-9]{40})["']/i,
        /key=([a-f0-9]{40})/i,
        /redsky[^"]*key[=:]([a-f0-9]{40})/i,
      ];

      for (const pattern of keyPatterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
          log(`✅ Found fresh API key: ${match[1].slice(0, 8)}...`);
          return match[1];
        }
      }
    }
  } catch (err) {
    log(`⚠️  Could not fetch target.com: ${(err as Error).message}`);
  }

  log(`⚠️  Using default API key: ${DEFAULT_API_KEY.slice(0, 8)}...`);
  return DEFAULT_API_KEY;
}

/**
 * Find nearest Target store by ZIP code.
 */
async function findNearestStore(apiKey: string, zipCode: string): Promise<{ storeId: string; name: string; address: string }> {
  log(`Searching for nearest Target store to ZIP ${zipCode}...`);

  const url = `${STORE_URL}?key=${apiKey}&place=${encodeURIComponent(zipCode)}&limit=1&within=50&unit=mile`;

  const response = await fetch(url, { headers: getRequestHeaders() });

  if (!response.ok) {
    const text = await response.text();
    log(`⚠️  Store lookup failed (${response.status}): ${text.slice(0, 200)}`);
    log(`Using default store ID: ${DEFAULT_STORE_ID}`);
    return {
      storeId: DEFAULT_STORE_ID,
      name: "Target (Richmond, VA)",
      address: `Near ZIP ${zipCode}`,
    };
  }

  const data = (await response.json()) as TargetStoreResponse;

  const stores = data?.data?.nearby_stores;
  if (stores && stores.length > 0) {
    const store = stores[0];
    const addr = store.address;
    const addressStr = addr
      ? `${addr.address_line1}, ${addr.city}, ${addr.state} ${addr.postal_code}`
      : `Near ZIP ${zipCode}`;

    log(`✅ Found store: ${store.store_name} — ${addressStr}`);
    log(`   Store ID: ${store.store_id}`);

    return {
      storeId: store.store_id,
      name: store.store_name || "Target",
      address: addressStr,
    };
  }

  log(`⚠️  No stores found, using default store ID: ${DEFAULT_STORE_ID}`);
  return {
    storeId: DEFAULT_STORE_ID,
    name: "Target (Richmond, VA)",
    address: `Near ZIP ${zipCode}`,
  };
}

/**
 * Search Target products via Redsky API.
 */
async function searchProducts(
  apiKey: string,
  storeId: string,
  searchTerm: string,
  retryCount = 0
): Promise<TargetProduct[]> {
  const params = new URLSearchParams({
    key: apiKey,
    channel: "WEB",
    keyword: searchTerm,
    count: "24",
    offset: "0",
    pricing_store_id: storeId,
    scheduled_delivery_store_id: storeId,
    default_purchasability_filter: "true",
    include_sponsored: "false",
    page: `/s/${encodeURIComponent(searchTerm)}`,
    platform: "desktop",
    useragent: USER_AGENT,
    visitor_id: generateVisitorId(),
  });

  const url = `${SEARCH_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, { headers: getRequestHeaders() });

    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const waitMs = RETRY_DELAY_MS * (retryCount + 1);
        log(`⚠️  Rate limited on "${searchTerm}" — waiting ${waitMs / 1000}s (retry ${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(waitMs);
        return searchProducts(apiKey, storeId, searchTerm, retryCount + 1);
      }
      logError(`Rate limited on "${searchTerm}" — max retries exceeded`);
      return [];
    }

    if (response.status === 403) {
      logError(`Forbidden (403) on "${searchTerm}" — API key may have expired`);
      return [];
    }

    if (!response.ok) {
      const text = await response.text();
      logError(`Search for "${searchTerm}" failed (${response.status}): ${text.slice(0, 200)}`);
      return [];
    }

    const data = (await response.json()) as TargetSearchResponse;
    return data?.data?.search?.products || [];
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      log(`⚠️  Network error on "${searchTerm}" — retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
      return searchProducts(apiKey, storeId, searchTerm, retryCount + 1);
    }
    logError(`Search for "${searchTerm}" failed after ${MAX_RETRIES} retries: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Generate a random visitor ID (UUID-like).
 */
function generateVisitorId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

/**
 * Parse size/quantity from product title.
 * Target titles often include size info like "- 16oz" or "- 1lb" at the end.
 */
function parseSizeFromTitle(title: string): string | null {
  // Common patterns in Target product titles
  const sizePatterns = [
    /[-–]\s*([\d.]+\s*(?:oz|fl\s*oz|lb|lbs|ct|count|pk|pack|gal|gallon|qt|pt|ml|l|kg|g))\b/i,
    /\b([\d.]+\s*(?:oz|fl\s*oz|lb|lbs|ct|count|pk|pack|gal|gallon|qt|pt|ml|l|kg|g))\s*$/i,
    /\(([\d.]+\s*(?:oz|fl\s*oz|lb|lbs|ct|count|pk|pack|gal|gallon|qt|pt|ml|l|kg|g))\)/i,
  ];

  for (const pattern of sizePatterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractProducts(
  products: TargetProduct[],
  searchTerm: string,
  searchCategory: string
): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];

  for (const product of products) {
    const title = product.item?.product_description?.title || "";
    if (!title) continue;

    // Extract pricing
    const priceData = product.price;
    let currentPrice: number | null = null;
    let regPrice: number | null = null;
    let promoPrice: number | null = null;

    if (priceData) {
      // current_retail is the displayed price
      currentPrice = priceData.current_retail ?? priceData.current_retail_min ?? null;
      regPrice = priceData.reg_retail ?? null;

      // If current price differs from reg price, current is the promo
      if (currentPrice != null && regPrice != null && currentPrice < regPrice) {
        promoPrice = currentPrice;
      }
    }

    // Skip products without any price
    if (currentPrice === null) continue;

    const size = parseSizeFromTitle(title);
    const buyUrl = product.item?.enrichment?.buy_url || null;

    results.push({
      tcin: product.tcin,
      name: title,
      searchTerm,
      searchCategory,
      price: regPrice ?? currentPrice,
      promoPrice,
      regPrice,
      size,
      url: buyUrl,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Merge logic: update grocery-prices.json with real Target data
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

function mergeTargetPrices(scrapedProducts: ScrapedProduct[]): void {
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
    if (
      !existing ||
      (product.price != null &&
        (existing.price == null || product.price < existing.price))
    ) {
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
        item.prices.target = {
          price: scraped.price,
          estimated: false,
          source: `Target Redsky API ${now} — ${scraped.name}`,
        };
        updated++;
        break; // Use first matching term
      }
    }
  }

  // Write back
  fs.writeFileSync(groceryPricesPath, JSON.stringify(groceryPrices, null, 2) + "\n");
  log(`✅ Merged ${updated} Target prices into grocery-prices.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();

  const zipCode = process.env.TARGET_ZIP_CODE || DEFAULT_ZIP_CODE;

  console.log(`
┌──────────────────────────────────────────┐
│  🎯 Target Grocery Price Scraper         │
│  GrocerScan — Real Price Data Pipeline   │
└──────────────────────────────────────────┘
`);

  // Step 1: Get API key
  let apiKey: string;
  try {
    apiKey = process.env.TARGET_API_KEY || (await getApiKey());
  } catch (err) {
    logError(`Failed to get API key: ${(err as Error).message}`);
    apiKey = DEFAULT_API_KEY;
  }

  // Step 2: Find nearest store
  let storeInfo: { storeId: string; name: string; address: string };
  try {
    storeInfo = await findNearestStore(apiKey, zipCode);
  } catch (err) {
    logError(`Store search failed: ${(err as Error).message}`);
    storeInfo = {
      storeId: DEFAULT_STORE_ID,
      name: "Target (Richmond, VA)",
      address: `Near ZIP ${zipCode}`,
    };
  }

  await sleep(RATE_LIMIT_MS);

  // Step 3: Search products by category
  const allProducts: ScrapedProduct[] = [];
  const categoryCounts: Record<string, number> = {};
  const totalTerms = Object.values(SEARCH_TERMS).reduce(
    (sum, terms) => sum + terms.length,
    0
  );
  let completedTerms = 0;

  for (const [category, terms] of Object.entries(SEARCH_TERMS)) {
    log(`\n📦 Category: ${category.toUpperCase()} (${terms.length} terms)`);
    let categoryCount = 0;

    for (const term of terms) {
      completedTerms++;
      const progress = `[${completedTerms}/${totalTerms}]`;

      try {
        const products = await searchProducts(apiKey, storeInfo.storeId, term);
        const extracted = extractProducts(products, term, category);
        allProducts.push(...extracted);
        categoryCount += extracted.length;

        const prices = extracted.filter((p) => p.price != null).map((p) => p.price!);
        const priceRange =
          prices.length > 0
            ? `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
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

  // Step 4: Save raw Target data
  const outputDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output: TargetPricesOutput = {
    scraped_at: new Date().toISOString(),
    store: {
      storeId: storeInfo.storeId,
      zipCode,
      chain: "Target",
    },
    total_products: allProducts.length,
    categories: categoryCounts,
    products: allProducts,
  };

  const outputPath = path.resolve(outputDir, "target-prices.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  log(`\n💾 Saved ${allProducts.length} products to ${outputPath}`);

  // Step 5: Merge into grocery-prices.json
  log("\n🔄 Merging into grocery-prices.json...");
  mergeTargetPrices(allProducts);

  // Summary
  console.log(`
┌──────────────────────────────────────────┐
│  ✅ Scraping Complete!                    │
├──────────────────────────────────────────┤
│  Store: ${(storeInfo.name || "").padEnd(32)}│
│  Total products: ${String(allProducts.length).padEnd(23)}│
│  Categories:                             │`);

  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(
      `│    ${cat.padEnd(20)} ${String(count).padStart(4)} products   │`
    );
  }

  console.log(`├──────────────────────────────────────────┤
│  Output: data/target-prices.json         │
│  Merged: data/grocery-prices.json        │
└──────────────────────────────────────────┘`);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  process.exit(1);
});
