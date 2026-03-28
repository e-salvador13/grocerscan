/**
 * Receipt history — persisted in localStorage.
 * Stores up to MAX_HISTORY receipts with compressed thumbnails.
 */

const STORAGE_KEY = 'grocerscan_history';
const MAX_HISTORY = 10;
const MAX_IMAGE_BYTES = 200 * 1024; // 200 KB compressed thumbnail

export interface SavedReceipt {
  id: string;
  store: string;        // store key (walmart, kroger, whole_foods, upload …)
  storeName: string;     // display name
  date: string;          // analysis date
  totalSpent: number;
  savingsFound: number;
  itemCount: number;
  imageUrl?: string;     // dataUrl (compressed) for uploads, static path for samples
  parsedItems?: any[];   // only for uploads — used to re-analyze
  receiptTotal?: number;
  timestamp: number;     // epoch ms
}

/* ------------------------------------------------------------------ */
/*  Image compression (canvas-based, browser only)                    */
/* ------------------------------------------------------------------ */

export function compressImage(dataUrl: string, maxBytes: number = MAX_IMAGE_BYTES): Promise<string> {
  return new Promise((resolve) => {
    // If already small enough, return as-is
    if (dataUrl.length <= maxBytes) {
      resolve(dataUrl);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      const MAX_DIM = 400; // thumbnail size
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under limit
      let quality = 0.7;
      let result = canvas.toDataURL('image/jpeg', quality);
      while (result.length > maxBytes && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(result);
    };
    img.onerror = () => resolve(dataUrl); // fallback
    img.src = dataUrl;
  });
}

/* ------------------------------------------------------------------ */
/*  CRUD helpers                                                      */
/* ------------------------------------------------------------------ */

function readStore(): SavedReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedReceipt[];
  } catch {
    return [];
  }
}

function writeStore(receipts: SavedReceipt[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch {
    // quota exceeded — trim oldest until it fits
    let list = [...receipts];
    while (list.length > 1) {
      list.pop();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return;
      } catch {
        /* keep trimming */
      }
    }
  }
}

/** Save a receipt.  Deduplicates by `id`. Keeps newest MAX_HISTORY. */
export function saveReceipt(receipt: SavedReceipt): void {
  let list = readStore().filter((r) => r.id !== receipt.id);
  list.unshift(receipt);
  if (list.length > MAX_HISTORY) {
    list = list.slice(0, MAX_HISTORY);
  }
  writeStore(list);
}

/** Get all saved receipts, newest first. */
export function getHistory(): SavedReceipt[] {
  return readStore().sort((a, b) => b.timestamp - a.timestamp);
}

/** Delete a single receipt by id. */
export function deleteReceipt(id: string): void {
  writeStore(readStore().filter((r) => r.id !== id));
}

/** Nuke everything. */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
