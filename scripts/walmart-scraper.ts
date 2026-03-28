#!/usr/bin/env npx tsx
/**
 * Walmart Grocery Price Scraper (Browser-based)
 *
 * Uses Puppeteer to load Walmart search pages in a real browser,
 * bypassing bot detection, and extracts product data from __NEXT_DATA__.
 *
 * Usage:
 *   npm run scrape:walmart
 *
 * No API keys needed — uses walmart.com public search.
 */

import fs from "fs";
import path from "path";
import puppeteer, { Browser, Page } from "puppeteer";

// ---------------------------------------------------------------------------
// Config & Types
// ---------------------------------------------------------------------------

const ZIP_CODE = process.env.WALMART_ZIP_CODE || "23220";
const GROCERY_CAT_ID = "976759";
const RATE_LIMIT_MS = 3000; // ms between page loads
const MAX_RETRIES = 2;

interface ScrapedProduct {
  name: string;
  price: number | null;
  unitPrice: string | null;
  size: string | null;
  brand: string | null;
  category: string;
  searchTerm: string;
  searchCategory: string;
  url: string | null;
  rating: number | null;
  reviews: number | null;
}

// ---------------------------------------------------------------------------
// Search terms by category (identical to Kroger scraper)
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
// ID mapping for merge (identical to Kroger scraper)
// ---------------------------------------------------------------------------

const ID_TO_SEARCH_TERMS: Record<string, string[]> = {
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
  "water-bottles-24pack": ["water"],
  "coca-cola-12pack": ["soda"],
  "orange-juice-64oz": ["juice"],
  "coffee-ground-12oz": ["coffee"],
  "green-tea-bags-20ct": ["tea"],
  "gatorade-8pack": ["sports drink"],
  "red-bull-4pack": ["energy drink"],
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
  "frozen-pizza-digiorno": ["frozen pizza"],
  "ice-cream-48oz": ["ice cream"],
  "frozen-vegetables-mixed-16oz": ["frozen vegetables"],
  "frozen-french-fries-32oz": ["frozen fries"],
  "frozen-chicken-nuggets-24oz": ["frozen chicken nuggets"],
  "frozen-waffles-10ct": ["frozen waffles"],
  "frozen-berries-mixed-12oz": ["frozen fruit"],
  "chips-potato-8oz": ["chips"],
  "crackers-saltine-16oz": ["crackers"],
  "granola-bars-6ct": ["granola bars"],
  "pretzels-16oz": ["pretzels"],
  "trail-mix-16oz": ["trail mix"],
  "popcorn-microwave-3ct": ["popcorn"],
  "nuts-almonds-16oz": ["nuts"],
  "oreos-14oz": ["cookies"],
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
// Browser-based scraping
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  // Connect to Clawd's managed Chrome instance via CDP
  // This is a REAL browser window, not headless — bypasses bot detection
  const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:18800";
  
  log(`Connecting to Clawd browser at ${CDP_URL}...`);
  
  // First, start the Clawd browser if not running
  try {
    const resp = await fetch("http://127.0.0.1:18791/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: "clawd" }) });
    if (resp.ok) log("✅ Clawd browser started");
  } catch { /* already running */ }
  
  await sleep(2000); // Give browser time to start
  
  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  
  log("✅ Connected to browser");
  return browser;
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  
  // Set realistic viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  
  // Set cookies for location
  await page.setCookie({
    name: "walmart.nearestPostalCode",
    value: ZIP_CODE,
    domain: ".walmart.com",
  });

  return page;
}

async function searchWalmart(
  page: Page,
  searchTerm: string,
  searchCategory: string,
  retries = 0,
): Promise<ScrapedProduct[]> {
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}&cat_id=${GROCERY_CAT_ID}`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Wait for content to load
    await sleep(1500);

    // Dismiss any dialogs/overlays
    try {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(b => {
          if (b.textContent?.includes('Continue shopping') || b.textContent?.includes('Dismiss')) {
            (b as HTMLElement).click();
          }
        });
      });
    } catch { /* ignore */ }

    // Extract product data from __NEXT_DATA__
    const products = await page.evaluate((searchCat: string, searchT: string) => {
      const script = document.querySelector('script#__NEXT_DATA__');
      if (!script?.textContent) return [];

      try {
        const data = JSON.parse(script.textContent);
        const items = data?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];

        return items
          .filter((item: any) => item.price != null && item.price > 0 && !item.sponsoredProduct)
          .slice(0, 10) // Top 10 non-sponsored results
          .map((item: any) => ({
            name: item.name || "",
            price: item.price || null,
            unitPrice: item.priceInfo?.unitPrice || null,
            size: null,
            brand: item.brand || null,
            category: searchCat,
            searchTerm: searchT,
            searchCategory: searchCat,
            url: item.canonicalUrl ? `https://www.walmart.com${item.canonicalUrl}` : null,
            rating: item.averageRating || null,
            reviews: item.numberOfReviews || null,
          }));
      } catch {
        return [];
      }
    }, searchCategory, searchTerm);

    return products;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      log(`⚠️  Retry ${retries + 1} for "${searchTerm}"...`);
      await sleep(5000 * (retries + 1));
      return searchWalmart(page, searchTerm, searchCategory, retries + 1);
    }
    logError(`Failed "${searchTerm}" after ${MAX_RETRIES + 1} attempts: ${(err as Error).message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Merge logic
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

  // Build a map: searchTerm -> cheapest product
  const termMap = new Map<string, ScrapedProduct>();
  for (const product of scrapedProducts) {
    const existing = termMap.get(product.searchTerm);
    if (
      !existing ||
      (product.price != null && (existing.price == null || product.price < existing.price))
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
          source: `Walmart.com ${now} — ${scraped.name}`,
        };
        updated++;
        break;
      }
    }
  }

  fs.writeFileSync(groceryPricesPath, JSON.stringify(groceryPrices, null, 2) + "\n");
  log(`✅ Merged ${updated} Walmart prices into grocery-prices.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`
┌──────────────────────────────────────────┐
│  🏪 Walmart Grocery Price Scraper        │
│  GrocerScan — Browser-Based Pipeline     │
└──────────────────────────────────────────┘
`);

  log(`Target ZIP code: ${ZIP_CODE}`);
  log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);

  const browser = await launchBrowser();
  const page = await setupPage(browser);

  const allProducts: ScrapedProduct[] = [];
  const categoryCounts: Record<string, number> = {};
  const totalTerms = Object.values(SEARCH_TERMS).reduce((sum, terms) => sum + terms.length, 0);
  let completedTerms = 0;

  try {
    for (const [category, terms] of Object.entries(SEARCH_TERMS)) {
      log(`\n📦 Category: ${category.toUpperCase()} (${terms.length} terms)`);
      let categoryCount = 0;

      for (const term of terms) {
        completedTerms++;
        const progress = `[${completedTerms}/${totalTerms}]`;

        try {
          const products = await searchWalmart(page, term, category);
          allProducts.push(...products);
          categoryCount += products.length;

          if (products.length > 0) {
            const prices = products.filter(p => p.price != null).map(p => p.price!);
            const priceRange = prices.length > 0
              ? `$${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
              : "no prices";
            log(`  ${progress} "${term}" → ${products.length} products (${priceRange})`);
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
  } finally {
    // Don't close the browser — we're connected to Clawd's instance
    browser.disconnect();
    log("\n🔒 Browser disconnected");
  }

  // Save raw data
  const outputDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    scraped_at: new Date().toISOString(),
    store: {
      name: "Walmart",
      zip_code: ZIP_CODE,
      method: "browser-scrape",
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
│  Store: Walmart (${ZIP_CODE})                    │
│  Total products: ${String(allProducts.length).padEnd(23)}│
│  Categories:                             │`);

  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`│    ${cat.padEnd(20)} ${String(count).padStart(4)} products   │`);
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
