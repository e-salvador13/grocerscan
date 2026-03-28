'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

import {
  FileText,
  Scissors,
  ShoppingCart,
  AlertTriangle,
  TrendingDown,
  Eye,
  X,
  ScanLine,
} from 'lucide-react';
import { sampleReceipts, SampleReceiptKey } from '../lib/sample-receipts';
import { STORE_COLORS, AnalysisResult } from '../lib/types';
import { analyzeReceiptItems, ParsedReceiptInput } from '../lib/match-items';
import { saveReceipt, compressImage, SavedReceipt } from '../lib/receipt-history';
import ReportTab from './analysis/ReportTab';
import SmartSplitTab from './analysis/SmartSplitTab';
import ShoppingListTab from './analysis/ShoppingListTab';

/* ------------------------------------------------------------------ */
/*  Receipt Preview (dynamically generated from analysis data)         */
/* ------------------------------------------------------------------ */
function ReceiptPreview({ analysis }: { analysis: AnalysisResult }) {
  const storeInfo = STORE_COLORS[analysis.sourceStore] || { name: analysis.sourceStore };
  const subtotal = analysis.totalSpent;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  /** Turn "Strawberries (1 lb)" → "STRAWBERRIES 1LB" */
  function formatReceiptName(name: string): string {
    // Pull unit out of parentheses if present
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    let base = name;
    let unit = '';
    if (match) {
      base = match[1].trim();
      unit = match[2].trim().replace(/\s+/g, '').toUpperCase();
    }
    base = base.toUpperCase();
    if (base.length > 22) base = base.slice(0, 22);
    return unit ? `${base} ${unit}` : base;
  }

  return (
    <div
      className="mx-auto max-w-[340px] rounded-sm px-5 py-6 shadow-sm"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        backgroundColor: '#fafaf7',
        color: '#1a1a1a',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
    >
      {/* Store header */}
      <div className="text-center mb-1">
        <p className="font-bold text-base tracking-wide">{(storeInfo.name ?? analysis.sourceStore).toUpperCase()}</p>
        <p className="text-[11px] text-gray-500">{analysis.date}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">CUSTOMER COPY</p>
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-3" />

      {/* Items */}
      <div className="space-y-0.5">
        {analysis.items.map((item, i) => {
          const lineTotal = Math.round(item.price * item.quantity * 100) / 100;
          const displayName = formatReceiptName(item.name);
          const qtyLabel = item.quantity > 1 ? ` x${item.quantity}` : '';
          return (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate flex-1">
                {displayName}{qtyLabel}
              </span>
              <span className="tabular-nums whitespace-nowrap">
                {lineTotal.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-3" />

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span className="tabular-nums">{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>TAX</span>
          <span className="tabular-nums">{tax.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-double border-gray-500 my-2" />

      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL</span>
        <span className="tabular-nums">${total.toFixed(2)}</span>
      </div>

      {/* Footer */}
      <div className="text-center mt-5 space-y-1">
        <p className="text-[11px] text-gray-400">ITEMS: {analysis.items.length}</p>
        <p className="font-bold text-xs tracking-widest">THANK YOU FOR SHOPPING!</p>
        <p className="text-[10px] text-gray-400 mt-1">* * * * * * * * * *</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */
const tabs = [
  { id: 'report', label: 'Analysis Report', icon: FileText },
  { id: 'split', label: 'Smart Split', icon: Scissors },
  { id: 'list', label: 'Shopping List', icon: ShoppingCart },
] as const;

type TabId = (typeof tabs)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const receiptParam = searchParams.get('receipt') || 'walmart';
  const isUpload = receiptParam === 'upload';
  const receiptKey = receiptParam as SampleReceiptKey;
  const initialTab = (searchParams.get('tab') as TabId) || 'report';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [uploadAnalysis, setUploadAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Receipt viewer drawer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);

  // Track whether we already saved to history for this analysis
  const savedRef = useRef(false);

  /* ---- Resolve receipt image URL (uploads only) ---- */
  useEffect(() => {
    if (isUpload) {
      try {
        const stored = sessionStorage.getItem('uploadedReceipt');
        if (stored) {
          const parsed = JSON.parse(stored);
          setReceiptImageUrl(parsed.dataUrl ?? null);
        }
      } catch { /* ignore */ }
    }
  }, [isUpload]);

  /* ---- For uploaded receipts: analyse from sessionStorage ---- */
  useEffect(() => {
    if (!isUpload) return;
    setUploadLoading(true);
    try {
      const stored = sessionStorage.getItem('parsedReceiptItems');
      if (!stored) {
        setUploadLoading(false);
        return;
      }
      const parsedItems: ParsedReceiptInput[] = JSON.parse(stored);
      const storedTotal = sessionStorage.getItem('receiptTotal');
      const receiptTotal = storedTotal ? parseFloat(storedTotal) : undefined;
      const result = analyzeReceiptItems(parsedItems, 'upload', receiptTotal);
      setUploadAnalysis(result);
    } catch (err) {
      console.error('Failed to analyze uploaded receipt:', err);
    } finally {
      setUploadLoading(false);
    }
  }, [isUpload]);

  const analysis: AnalysisResult | undefined = isUpload
    ? uploadAnalysis ?? undefined
    : sampleReceipts[receiptKey];

  /* ---- Auto-save to history once analysis is ready ---- */
  const doSave = useCallback(async () => {
    if (!analysis || savedRef.current) return;
    savedRef.current = true;

    let imageUrl: string | undefined;
    let parsedItems: any[] | undefined;
    let receiptTotal: number | undefined;

    if (isUpload) {
      // Compress the upload thumbnail for localStorage
      try {
        const stored = sessionStorage.getItem('uploadedReceipt');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.dataUrl) {
            imageUrl = await compressImage(parsed.dataUrl);
          }
        }
      } catch { /* ignore */ }
      // Also stash parsedItems for re-analysis
      try {
        const items = sessionStorage.getItem('parsedReceiptItems');
        if (items) parsedItems = JSON.parse(items);
        const total = sessionStorage.getItem('receiptTotal');
        if (total) receiptTotal = parseFloat(total);
      } catch { /* ignore */ }
    } else {
      // Sample receipts use dynamically generated previews; no static image needed
      imageUrl = undefined;
    }

    const storeInfo = STORE_COLORS[analysis.sourceStore] || { name: analysis.sourceStore };

    const entry: SavedReceipt = {
      id: `${analysis.sourceStore}-${Date.now()}`,
      store: analysis.sourceStore,
      storeName: storeInfo.name,
      date: analysis.date,
      totalSpent: analysis.totalSpent,
      savingsFound: analysis.savingsOpportunity,
      itemCount: analysis.items.length,
      imageUrl,
      parsedItems,
      receiptTotal,
      timestamp: Date.now(),
    };
    saveReceipt(entry);
  }, [analysis, isUpload, receiptKey]);

  useEffect(() => {
    doSave();
  }, [doSave]);

  /* ---- Loading / error states ---- */
  if (isUpload && uploadLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Analyzing your receipt...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-2">Receipt not found.</p>
          {isUpload && (
            <a href="/" className="text-sm text-primary font-semibold hover:underline">
              ← Upload a new receipt
            </a>
          )}
        </div>
      </div>
    );
  }

  const storeInfo = STORE_COLORS[analysis.sourceStore] || {
    primary: '#6c757d',
    name: analysis.sourceStore,
  };

  const variancePct = ((analysis.savingsOpportunity / analysis.bestAlternativeTotal) * 100).toFixed(1);
  const isOverpaid = analysis.savingsOpportunity > 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* ============================================================ */}
      {/*  Receipt Viewer Drawer (right slide-out)                     */}
      {/* ============================================================ */}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{
          opacity: viewerOpen ? 1 : 0,
          pointerEvents: viewerOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={() => setViewerOpen(false)}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col"
        style={{
          transform: viewerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: viewerOpen ? '-8px 0 30px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">{storeInfo.name} Receipt</p>
            <p className="text-xs text-gray-500">{analysis.date}</p>
          </div>
          <button
            onClick={() => setViewerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Drawer body — scrollable receipt */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isUpload && receiptImageUrl ? (
            /* Uploaded receipt: show the actual photo */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={receiptImageUrl}
              alt="Receipt"
              className="w-full rounded-lg shadow-sm"
              style={{ objectFit: 'contain' }}
            />
          ) : !isUpload && analysis ? (
            /* Sample receipt: dynamically generated from analysis data */
            <ReceiptPreview analysis={analysis} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No receipt image available
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Header                                                      */}
      {/* ============================================================ */}
      <div
        className="bg-surface-lowest"
        style={{ boxShadow: '0 1px 0 rgba(25,28,29,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial">
                  ANALYSIS REPORT · {analysis.date}
                </p>
                {isOverpaid && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-editorial px-2.5 py-1 rounded-lg bg-error-container text-error">
                    <AlertTriangle size={10} />
                    OVERPAID
                  </span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-text tracking-tight">
                <span style={{ color: storeInfo.primary }}>{storeInfo.name}</span> Receipt
              </h1>
              {isOverpaid && (
                <p className="text-text-secondary mt-1 font-medium">
                  +{variancePct}% above market benchmark
                </p>
              )}

              {/* Action buttons row */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setViewerOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-surface-low hover:bg-surface text-text-secondary hover:text-text transition-colors ghost-border"
                >
                  <Eye size={15} />
                  View Receipt
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors"
                >
                  <ScanLine size={15} />
                  Scan Another
                </button>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial">
                  TOTAL SPENT
                </p>
                <p className="text-2xl font-extrabold text-text mt-0.5">
                  ${analysis.totalSpent.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-primary uppercase tracking-editorial">
                  SAVINGS FOUND
                </p>
                <p className="text-2xl font-extrabold text-primary mt-0.5 flex items-center gap-1.5 justify-end">
                  <TrendingDown size={18} />
                  ${analysis.savingsOpportunity.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
                    isActive
                      ? 'text-secondary bg-surface'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-low'
                  }`}
                  style={isActive ? {
                    boxShadow: 'inset 0 -2px 0 #4c56af',
                  } : undefined}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div key={activeTab}>
        {activeTab === 'report' && <ReportTab analysis={analysis} />}
        {activeTab === 'split' && <SmartSplitTab analysis={analysis} />}
        {activeTab === 'list' && <ShoppingListTab analysis={analysis} />}
      </div>
    </div>
  );
}
