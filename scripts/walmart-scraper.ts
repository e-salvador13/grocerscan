#!/usr/bin/env npx tsx
/**
 * Walmart Grocery Price Scraper
 *
 * Scrapes real grocery prices from Walmart.com's public search pages
 * and saves them in a format compatible with the GrocerScan price database.
 *
 * Approach: Fetches Walmart search result pages and extracts product data
 * from the embedded __NEXT_DATA__ JSON blob. Falls back to a secondary
 * HTML parsing strategy if the JSON structure changes.
 *
 * Usage:
 *   npm run scrape:walmart
 *
 * Optional env vars (or .env file):
 *   WALMART_ZIP_CODE (default: 23220)
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config & Types
// ---------------------------------------------------------------------------

const SEARCH_BASE = "https://www.walmart.com/search";
const GROCERY_CAT_ID = "976759"; // Walmart grocery department
const RATE_LIMIT_MS = 2000; // ms between requests (be respectful)
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 5000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface WalmartProduct {
  name: string;
  price: number | null;
  unitPrice: string | null;
  size: string | null;
  brand: string | null;
  productId: string | null;
  url: string | null;
  rating: number | null;
  reviewCount: number | null;
}

interface ScrapedProduct {
  productId: string;
  name: string;
  brand: string;
  category: string;
  searchTerm: string;
  searchCategory: string;
  price: number | null;
  unitPrice: string | null;
  size: string | null;
  url: string | null;
}

interface WalmartPricesOutput {
  scraped_at: string;
  store: {
    name: string;
    zipCode: string;
  };
  total_products: number;
  categories: Record<string, number>;
  products: ScrapedProduct[];
}

// ---------------------------------------------------------------------------
// Search terms by category — EXACTLY matches Kroger scraper
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
// ID_TO_SEARCH_TERMS — EXACTLY matches Kroger scraper
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
// Walmart search page scraper
// ---------------------------------------------------------------------------

function buildSearchUrl(query: string, zipCode: string): string {
  const params = new URLSearchParams({
    q: query,
    cat_id: GROCERY_CAT_ID,
    facet: "fulfillment_method_in_store:In-store",
  });
  return `${SEARCH_BASE}?${params.toString()}`;
}

function getHeaders(zipCode: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    // Walmart uses cookies to resolve store/ZIP — we set a common one
    Cookie: `vtc.preferredStore={"zipCode":"${zipCode}","storeId":"","accessType":"DELIVERY_ADDRESS"}`,
  };
}

/**
 * Extract product data from the __NEXT_DATA__ JSON blob in the HTML.
 * Walmart's Next.js app embeds search result data in this script tag.
 */
function extractProductsFromNextData(html: string): WalmartProduct[] {
  const products: WalmartProduct[] = [];

  // Strategy 1: Parse __NEXT_DATA__ script tag
  const nextDataMatch = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/
  );

  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);

      // Navigate the Next.js data structure to find search results
      // The structure varies but typically lives under props.pageProps
      const searchResults = findSearchResults(nextData);

      if (searchResults && Array.isArray(searchResults)) {
        for (const item of searchResults) {
          const product = extractProductFromItem(item);
          if (product) {
            products.push(product);
          }
        }
      }

      if (products.length > 0) return products;
    } catch (e) {
      // JSON parse failed — fall through to other strategies
    }
  }

  // Strategy 2: Look for inline JSON data in various script tags
  // Walmart sometimes uses different data embedding strategies
  const scriptMatches = html.matchAll(
    /<script[^>]*>(\{[\s\S]*?"searchResult"[\s\S]*?\})<\/script>/g
  );

  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = findSearchResults(data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const product = extractProductFromItem(item);
          if (product) products.push(product);
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (products.length > 0) return products;

  // Strategy 3: Regex fallback — extract prices and names from structured data
  // This catches JSON-LD and other structured markup
  const jsonLdMatches = html.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g
  );

  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld["@type"] === "ItemList" && Array.isArray(ld.itemListElement)) {
        for (const elem of ld.itemListElement) {
          const item = elem.item;
          if (item?.name && item?.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            products.push({
              name: item.name,
              price: offer?.price != null ? parseFloat(offer.price) : null,
              unitPrice: null,
              size: null,
              brand: item.brand?.name || null,
              productId: item.productID || item.sku || null,
              url: item.url || null,
              rating: item.aggregateRating?.ratingValue
                ? parseFloat(item.aggregateRating.ratingValue)
                : null,
              reviewCount: item.aggregateRating?.reviewCount
                ? parseInt(item.aggregateRating.reviewCount)
                : null,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return products;
}

/**
 * Recursively search the Next.js data structure for the search results array.
 * Walmart's data nesting changes over time — this is resilient to that.
 */
function findSearchResults(obj: unknown, depth = 0): unknown[] | null {
  if (depth > 15 || obj == null || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;

  // Look for common keys that hold search result items
  for (const key of [
    "itemStacks",
    "items",
    "searchResult",
    "itemsV2",
    "products",
    "gridItems",
  ]) {
    if (Array.isArray(record[key])) {
      const arr = record[key] as unknown[];
      // itemStacks is an array of stacks, each with items
      if (key === "itemStacks" && arr.length > 0) {
        const stack = arr[0] as Record<string, unknown>;
        if (Array.isArray(stack?.items)) {
          return stack.items as unknown[];
        }
      }
      // If the array items look like products (have name/title + price), return
      if (arr.length > 0 && looksLikeProduct(arr[0])) {
        return arr;
      }
    }
  }

  // Recurse into nested objects
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      const result = findSearchResults(value, depth + 1);
      if (result) return result;
    }
  }

  return null;
}

function looksLikeProduct(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const r = item as Record<string, unknown>;
  return !!(r.name || r.title) && !!(r.price || r.priceInfo || r.currentPrice);
}

function extractProductFromItem(item: unknown): WalmartProduct | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;

  const name = (r.name || r.title || "") as string;
  if (!name) return null;

  // Extract price — Walmart nests this in various ways
  let price: number | null = null;
  let unitPrice: string | null = null;

  if (r.priceInfo && typeof r.priceInfo === "object") {
    const pi = r.priceInfo as Record<string, unknown>;
    if (pi.currentPrice && typeof pi.currentPrice === "object") {
      const cp = pi.currentPrice as Record<string, unknown>;
      price = typeof cp.price === "number" ? cp.price : null;
      if (price == null && typeof cp.priceString === "string") {
        const parsed = parseFloat((cp.priceString as string).replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) price = parsed;
      }
    }
    if (pi.unitPrice && typeof pi.unitPrice === "object") {
      const up = pi.unitPrice as Record<string, unknown>;
      unitPrice = (up.priceString as string) || null;
    }
  }

  // Fallback: direct price fields
  if (price == null && typeof r.price === "number") {
    price = r.price;
  }
  if (price == null && typeof r.currentPrice === "number") {
    price = r.currentPrice;
  }

  // Extract brand
  let brand: string | null = null;
  if (typeof r.brand === "string") {
    brand = r.brand;
  } else if (typeof r.brand === "object" && r.brand !== null) {
    brand = ((r.brand as Record<string, unknown>).name as string) || null;
  }

  // Extract size from name (common patterns: "16 oz", "1 lb", "12 ct")
  const sizeMatch = name.match(
    /(\d+\.?\d*\s*(?:oz|fl oz|lb|lbs|ct|count|pk|pack|gal|gallon|qt|quart|pt|pint|ml|l|liter|g|kg|sq ft|sqft))\b/i
  );

  return {
    name,
    price,
    unitPrice,
    size: sizeMatch ? sizeMatch[1] : null,
    brand,
    productId: (r.usItemId || r.productId || r.id || null) as string | null,
    url: r.canonicalUrl
      ? `https://www.walmart.com${r.canonicalUrl}`
      : (r.url as string) || null,
    rating: typeof r.averageRating === "number" ? r.averageRating : null,
    reviewCount: typeof r.numberOfReviews === "number" ? r.numberOfReviews : null,
  };
}

// ---------------------------------------------------------------------------
// Fetch with retry + backoff
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  retries = MAX_RETRIES
): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        redirect: "follow",
      });

      if (response.status === 429) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt);
        log(
          `⚠️  Rate limited (429) — backing off ${(backoff / 1000).toFixed(0)}s (attempt ${attempt + 1}/${retries + 1})`
        );
        await sleep(backoff);
        continue;
      }

      if (response.status === 403) {
        log(
          `⚠️  Forbidden (403) — Walmart may be blocking the request. Waiting ${(BACKOFF_BASE_MS / 1000).toFixed(0)}s...`
        );
        await sleep(BACKOFF_BASE_MS * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        logError(`HTTP ${response.status} for ${url}`);
        if (attempt < retries) {
          await sleep(BACKOFF_BASE_MS);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (err) {
      logError(`Network error: ${(err as Error).message}`);
      if (attempt < retries) {
        await sleep(BACKOFF_BASE_MS * (attempt + 1));
        continue;
      }
      return null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Search + extract
// ---------------------------------------------------------------------------

async function searchWalmart(
  query: string,
  zipCode: string
): Promise<WalmartProduct[]> {
  const url = buildSearchUrl(query, zipCode);
  const headers = getHeaders(zipCode);

  const html = await fetchWithRetry(url, headers);
  if (!html) return [];

  const products = extractProductsFromNextData(html);
  return products;
}

// ---------------------------------------------------------------------------
// Processing — convert raw products to scraped format
// ---------------------------------------------------------------------------

function processProducts(
  products: WalmartProduct[],
  searchTerm: string,
  searchCategory: string
): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];

  for (const product of products) {
    // Skip products without a price
    if (product.price == null) continue;

    // Skip obviously non-grocery items (basic filter)
    const nameLower = product.name.toLowerCase();
    if (
      nameLower.includes("phone case") ||
      nameLower.includes("charger") ||
      nameLower.includes("hdmi")
    ) {
      continue;
    }

    results.push({
      productId: product.productId || `walmart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: product.name,
      brand: product.brand || "Unknown",
      category: searchCategory,
      searchTerm,
      searchCategory,
      price: product.price,
      unitPrice: product.unitPrice,
      size: product.size,
      url: product.url,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Merge logic: update grocery-prices.json with real Walmart data
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

function mergeWalmartPrices(scrapedProducts: ScrapedProduct[]): void {
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
        item.prices.walmart = {
          price: scraped.price,
          estimated: false,
          source: `Walmart.com scrape ${now} — ${scraped.name}`,
        };
        updated++;
        break; // Use first matching term
      }
    }
  }

  // Write back
  fs.writeFileSync(groceryPricesPath, JSON.stringify(groceryPrices, null, 2) + "\n");
  log(`✅ Merged ${updated} Walmart prices into grocery-prices.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();

  const zipCode = process.env.WALMART_ZIP_CODE || "23220";

  console.log(`
┌──────────────────────────────────────────┐
│  🏪 Walmart Grocery Price Scraper        │
│  GrocerScan — Real Price Data Pipeline   │
└──────────────────────────────────────────┘
`);

  log(`Target ZIP code: ${zipCode}`);
  log(`Grocery category ID: ${GROCERY_CAT_ID}`);
  log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);

  // Scrape products by category
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
        const rawProducts = await searchWalmart(term, zipCode);
        const processed = processProducts(rawProducts, term, category);
        allProducts.push(...processed);
        categoryCount += processed.length;

        if (processed.length > 0) {
          const prices = processed
            .filter((p) => p.price != null)
            .map((p) => p.price!);
          const priceRange =
            prices.length > 0
              ? `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
              : "no prices";
          log(
            `  ${progress} "${term}" → ${processed.length} products (${priceRange})`
          );
        } else {
          log(`  ${progress} "${term}" → 0 products`);
        }
      } catch (err) {
        logError(`  ${progress} "${term}" failed: ${(err as Error).message}`);
      }

      await sleep(RATE_LIMIT_MS);
    }

    categoryCounts[category] = categoryCount;
    log(`  ✅ ${category}: ${categoryCount} products`);
  }

  // Save raw Walmart data
  const outputDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output: WalmartPricesOutput = {
    scraped_at: new Date().toISOString(),
    store: {
      name: "Walmart Supercenter",
      zipCode,
    },
    total_products: allProducts.length,
    categories: categoryCounts,
    products: allProducts,
  };

  const outputPath = path.resolve(outputDir, "walmart-prices.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  log(`\n💾 Saved ${allProducts.length} products to ${outputPath}`);

  // Merge into grocery-prices.json
  log("\n🔄 Merging into grocery-prices.json...");
  mergeWalmartPrices(allProducts);

  // Summary
  console.log(`
┌──────────────────────────────────────────┐
│  ✅ Scraping Complete!                    │
├──────────────────────────────────────────┤
│  Store: Walmart (ZIP ${zipCode})             │
│  Total products: ${String(allProducts.length).padEnd(23)}│
│  Categories:                             │`);

  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(
      `│    ${cat.padEnd(20)} ${String(count).padStart(4)} products   │`
    );
  }

  console.log(`├──────────────────────────────────────────┤
│  Output: data/walmart-prices.json        │
│  Merged: data/grocery-prices.json        │
└──────────────────────────────────────────┘`);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  process.exit(1);
});
