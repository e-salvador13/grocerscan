'use client';

import { useState, useCallback } from 'react';

import {
  TrendingDown,
  TrendingUp,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Minus,
} from 'lucide-react';
import {
  STORE_COLORS,
  STORE_NAMES,
  CATEGORY_ICONS,
  CATEGORY_DISPLAY,
  ReceiptItem,
  AnalysisResult,
} from '../../lib/types';

function generatePdfHtml(analysis: AnalysisResult): string {
  const storeName = STORE_NAMES[analysis.sourceStore] || analysis.sourceStore;
  const date = analysis.date;

  const itemRows = analysis.items
    .map((item) => {
      const savings = item.savings && item.savings > 0 ? `$${item.savings.toFixed(2)}` : '—';
      const bestStoreName = item.bestStore ? (STORE_NAMES[item.bestStore] || item.bestStore) : '—';
      const bestPrice = item.bestPrice ? `$${(item.bestPrice * item.quantity).toFixed(2)}` : '—';
      const rowColor = item.status === 'overcharged' ? '#fef2f2' : item.status === 'deal' ? '#f0fdf4' : '#ffffff';
      return `<tr style="background:${rowColor}">
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">$${(item.price * item.quantity).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#0d631b;font-weight:600;">${bestPrice}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${bestStoreName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#0d631b;font-weight:600;">${savings}</td>
      </tr>`;
    })
    .join('');

  const categoryRows = analysis.categoryBreakdown
    .map((cat) => {
      const icon = CATEGORY_ICONS[cat.category] || '📦';
      const displayName = CATEGORY_DISPLAY[cat.category] || cat.category;
      const varianceColor = cat.variance > 0 ? '#dc2626' : '#0d631b';
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${icon} ${displayName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${cat.itemCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">$${cat.yourTotal.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#0d631b;">$${cat.bestTotal.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:${varianceColor};font-weight:600;">${cat.variance > 0 ? '+' : ''}${cat.variance}%</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>GrocerScan Report — ${storeName} — ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    h2 { font-size: 18px; font-weight: 700; margin: 32px 0 12px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .cards { display: flex; gap: 16px; margin-bottom: 32px; }
    .card { flex: 1; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .card-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card-value { font-size: 24px; font-weight: 800; }
    .card-savings { background: #4c56af; color: white; border: none; }
    .card-savings .card-label { color: rgba(255,255,255,0.6); }
    .card-savings .card-value { color: #86efac; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🛒 GrocerScan Savings Report</h1>
  <p class="subtitle">Store: ${storeName} &nbsp;•&nbsp; Date: ${date} &nbsp;•&nbsp; ${analysis.items.length} items analyzed</p>

  <div class="cards">
    <div class="card">
      <div class="card-label">Total Spent</div>
      <div class="card-value">$${analysis.totalSpent.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Best Alternative Total</div>
      <div class="card-value">$${analysis.bestAlternativeTotal.toFixed(2)}</div>
    </div>
    <div class="card card-savings">
      <div class="card-label">Savings Opportunity</div>
      <div class="card-value">$${analysis.savingsOpportunity.toFixed(2)}</div>
    </div>
  </div>

  <h2>Item-by-Item Comparison</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right">You Paid</th>
        <th style="text-align:right">Best Price</th>
        <th style="text-align:center">Best Store</th>
        <th style="text-align:right">Savings</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <h2>Category Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align:center">Items</th>
        <th style="text-align:right">Your Total</th>
        <th style="text-align:right">Best Total</th>
        <th style="text-align:right">Variance</th>
      </tr>
    </thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <div class="footer">
    Generated by GrocerScan &nbsp;•&nbsp; ${new Date().toLocaleDateString()} &nbsp;•&nbsp; grocerscan.app
  </div>
</body>
</html>`;
}

export default function ReportTab({ analysis }: { analysis: AnalysisResult }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleDownloadPdf = useCallback(() => {
    const html = generatePdfHtml(analysis);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    // Small delay to let CSS render before print dialog
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }, [analysis]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Verdict Cards */}
      <div
       
       
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        <div className="card-base p-6">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial mb-1.5">
            TOTAL SPENT
          </p>
          <p className="text-3xl font-extrabold text-text tracking-tight">
            ${analysis.totalSpent.toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-error text-sm font-medium">
            <TrendingUp size={14} />
            <span>Above optimal</span>
          </div>
        </div>

        <div className="card-base p-6">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial mb-1.5">
            BEST ALTERNATIVE TOTAL
          </p>
          <p className="text-3xl font-extrabold text-text tracking-tight">
            ${analysis.bestAlternativeTotal.toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-secondary text-sm font-medium">
            <MapPin size={14} />
            <span>Market benchmark</span>
          </div>
        </div>

        <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(145deg, #4c56af 0%, #3730a3 100%)' }}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-editorial mb-1.5">
            SAVINGS OPPORTUNITY
          </p>
          <p className="text-3xl font-extrabold tracking-tight">
            <span className="text-green-300">${analysis.savingsOpportunity.toFixed(2)}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-green-300 text-sm font-medium">
            <TrendingDown size={14} />
            <span>Actionable insights</span>
          </div>
        </div>
      </div>

      {/* Item-by-Item Comparison Table */}
      <div
       
       
       
        className="card-base overflow-hidden"
      >
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="font-headline text-text">
              Item-by-Item Comparison
            </h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              {analysis.items.length} items analyzed across 6 stores
            </p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error" />
              Overcharged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Deal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-text-tertiary" />
              Similar
            </span>
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-low text-xs font-semibold text-text-tertiary uppercase tracking-editorial">
          <div className="col-span-4">ITEM</div>
          <div className="col-span-2 text-right">YOUR PRICE</div>
          <div className="col-span-2 text-right">BEST PRICE</div>
          <div className="col-span-2 text-center">BEST STORE</div>
          <div className="col-span-2 text-right">SAVINGS</div>
        </div>

        <div>
          {analysis.items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              isExpanded={expandedRow === i}
              onToggle={() => setExpandedRow(expandedRow === i ? null : i)}
              sourceStore={analysis.sourceStore}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div
       
       
       
        className="space-y-5"
      >
        <h2 className="font-headline text-text">
          Category Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {analysis.categoryBreakdown.map((cat) => (
            <CategoryCard key={cat.category} category={cat} items={analysis.items} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
       
       
       
        className="rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
        style={{
          background: 'linear-gradient(135deg, #0d631b08 0%, #4c56af08 100%)',
        }}
      >
        <div>
          <h3 className="text-2xl font-extrabold text-text tracking-tight">
            Savings Roadmap
          </h3>
          <p className="text-text-secondary mt-1.5">
            We&apos;ve identified ${analysis.savingsOpportunity.toFixed(2)} in
            potential savings. Download the optimized shopping list.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-secondary-light transition-colors"
          >
            <Download size={16} />
            Download Report
          </button>
          <button className="flex items-center gap-2 bg-surface-lowest text-text-secondary px-6 py-3 rounded-lg text-sm font-semibold hover:bg-surface-low transition-colors ghost-border">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isExpanded,
  onToggle,
  sourceStore,
  index,
}: {
  item: ReceiptItem;
  isExpanded: boolean;
  onToggle: () => void;
  sourceStore: string;
  index: number;
}) {
  const statusIcon =
    item.status === 'overcharged' ? (
      <AlertTriangle size={14} className="text-error" />
    ) : item.status === 'deal' ? (
      <CheckCircle size={14} className="text-primary" />
    ) : (
      <Minus size={14} className="text-text-tertiary" />
    );

  const rowBg =
    item.status === 'overcharged'
      ? 'bg-error-container/40'
      : item.status === 'deal'
      ? 'bg-primary-container/30'
      : index % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low/30';

  return (
    <div className={rowBg}>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm hover:bg-surface-low/50 transition-colors text-left"
      >
        <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
          {statusIcon}
          <span className="font-semibold text-text">{item.name}</span>
          {item.quantity > 1 && (
            <span className="text-xs text-text-tertiary bg-surface-low px-1.5 py-0.5 rounded font-medium">
              ×{item.quantity}
            </span>
          )}
        </div>
        <div className="col-span-3 sm:col-span-2 text-right font-semibold text-text">
          ${(item.price * item.quantity).toFixed(2)}
        </div>
        <div className="col-span-3 sm:col-span-2 text-right font-semibold text-primary">
          {item.bestPrice
            ? `$${(item.bestPrice * item.quantity).toFixed(2)}`
            : '-'}
        </div>
        <div className="col-span-3 sm:col-span-2 text-center">
          {item.bestStore && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{
                backgroundColor: `${STORE_COLORS[item.bestStore]?.primary}10`,
                color: STORE_COLORS[item.bestStore]?.primary,
              }}
            >
              {STORE_NAMES[item.bestStore]}
            </span>
          )}
        </div>
        <div className="col-span-3 sm:col-span-2 text-right flex items-center justify-end gap-2">
          {item.savings && item.savings > 0 ? (
            <span className="font-bold text-primary price-pulse rounded-md px-1">
              -${item.savings.toFixed(2)}
            </span>
          ) : (
            <span className="text-text-tertiary text-xs">—</span>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={14} className="text-text-tertiary" />
          )}
        </div>
      </button>

      {isExpanded && item.matchedItem && (
        <div
         
         
         
          className="px-6 pb-5"
        >
          <div className="bg-surface-low rounded-xl p-5">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial mb-4">
              PRICE AT ALL STORES
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(item.matchedItem.prices).map(
                ([store, priceObj]) => {
                  const p = (priceObj as { price: number }).price;
                  const isSource = store === sourceStore;
                  const isBest = store === item.bestStore;
                  const storeColor = STORE_COLORS[store]?.primary || '#6c757d';
                  return (
                    <div
                      key={store}
                      className={`rounded-xl p-3 text-center transition-all ${
                        isBest
                          ? 'bg-primary-container price-pulse'
                          : isSource
                          ? 'bg-error-container'
                          : 'bg-surface-lowest ghost-border'
                      }`}
                    >
                      <div
                        className="text-xs font-bold mb-1"
                        style={{ color: storeColor }}
                      >
                        {STORE_NAMES[store]}
                      </div>
                      <div className="text-lg font-extrabold text-text">
                        ${p.toFixed(2)}
                      </div>
                      {isBest && (
                        <span className="text-[10px] text-primary font-bold uppercase tracking-editorial">
                          BEST
                        </span>
                      )}
                      {isSource && !isBest && (
                        <span className="text-[10px] text-error font-bold uppercase tracking-editorial">
                          YOU PAID
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  items,
}: {
  category: {
    category: string;
    itemCount: number;
    yourTotal: number;
    bestTotal: number;
    variance: number;
  };
  items: ReceiptItem[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const icon = CATEGORY_ICONS[category.category] || '📦';
  const isOverpriced = category.variance > 0;

  // Filter items that belong to this category
  const categoryItems = items.filter(
    (item) => (item.matchedItem?.category || 'other') === category.category
  );

  return (
    <div className="card-base p-5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <h3 className="font-semibold text-text">
              {CATEGORY_DISPLAY[category.category] || category.category}
            </h3>
            <span className="text-xs text-text-tertiary font-medium ml-1">
              {category.itemCount} items
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-tertiary uppercase tracking-editorial font-semibold">VAR:</span>
              <span
                className={`text-sm font-bold ${
                  isOverpriced ? 'text-error' : 'text-primary'
                }`}
              >
                {isOverpriced ? '+' : ''}
                {category.variance}%
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp size={16} className="text-text-tertiary" />
            ) : (
              <ChevronDown size={16} className="text-text-tertiary" />
            )}
          </div>
        </div>
      </button>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
            <span className="uppercase tracking-editorial font-semibold">
              YOUR TOTAL
            </span>
            <span className="font-bold text-text">
              ${category.yourTotal.toFixed(2)}
            </span>
          </div>
          <div className="h-2.5 bg-surface-low rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '100%',
                backgroundColor: isOverpriced ? '#b91c1c' : '#0d631b',
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
            <span className="uppercase tracking-editorial font-semibold">
              BEST PRICE
            </span>
            <span className="font-bold text-text">
              ${category.bestTotal.toFixed(2)}
            </span>
          </div>
          <div className="h-2.5 bg-surface-low rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-secondary"
              style={{
                width: `${Math.min((category.bestTotal / category.yourTotal) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Expandable item list */}
      {isExpanded && categoryItems.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(25,28,29,0.06)' }}>
          <div className="space-y-2.5">
            {categoryItems.map((item, i) => {
              const yourPrice = item.price * item.quantity;
              const bestPrice = item.bestPrice
                ? item.bestPrice * item.quantity
                : yourPrice;
              const bestStoreColor = item.bestStore
                ? STORE_COLORS[item.bestStore]?.primary || '#6c757d'
                : '#6c757d';
              const bestStoreName = item.bestStore
                ? STORE_NAMES[item.bestStore] || item.bestStore
                : '';

              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-low/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="text-xs text-text-tertiary ml-1">×{item.quantity}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary">You paid</p>
                      <p className="text-sm font-semibold text-text">${yourPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary">Best</p>
                      <p className={`text-sm font-semibold ${bestPrice < yourPrice ? 'text-primary' : 'text-text'}`}>
                        ${bestPrice.toFixed(2)}
                      </p>
                    </div>
                    {bestStoreName && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                        style={{
                          backgroundColor: `${bestStoreColor}12`,
                          color: bestStoreColor,
                        }}
                      >
                        {bestStoreName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
