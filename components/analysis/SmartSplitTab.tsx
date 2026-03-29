'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingDown,
  Ticket,
  MapPin,
  Navigation,
  ArrowDown,
  ShoppingCart,
  Package,
  Tag,
  Zap,
  Clock,
  Car,
  ExternalLink,
  CircleDot,
} from 'lucide-react';
import {
  AnalysisResult,
  STORE_COLORS,
  STORE_NAMES,
} from '../../lib/types';
import StoreLogo from '../StoreLogo';

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!show) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        tipRef.current?.contains(e.target as Node)
      ) return;
      setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setShow(!show)}
        className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[10px] font-bold text-white/80 transition-colors"
        aria-label="How is this calculated?"
      >
        ?
      </button>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          ref={tipRef}
          className="fixed z-[9999] w-56 rounded-lg px-3 py-2.5 text-xs text-gray-700 leading-relaxed shadow-xl"
          style={{
            backgroundColor: '#fff',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white" />
        </div>,
        document.body
      )}
    </>
  );
}

// Florence, KY store locations for route planning
const FLORENCE_STORES: Record<string, { address: string; lat: number; lng: number }> = {
  walmart: { address: '7625 Mall Rd, Florence, KY 41042', lat: 38.9924, lng: -84.6473 },
  kroger: { address: '7609 Mall Rd, Florence, KY 41042', lat: 38.9926, lng: -84.6460 },
  aldi: { address: '7539 Mall Rd, Florence, KY 41042', lat: 38.9930, lng: -84.6445 },
  target: { address: '7725 Mall Rd, Florence, KY 41042', lat: 38.9920, lng: -84.6500 },
  lidl: { address: '7801 Burlington Pike, Florence, KY 41042', lat: 38.9895, lng: -84.6370 },
  whole_foods: { address: '2660 Edmondson Rd, Crestview Hills, KY 41017', lat: 39.0275, lng: -84.5850 },
};

const STARTING_POINT = {
  label: '410 Meijer Dr, Florence, KY 41042',
  lat: 38.9940,
  lng: -84.6380,
};

// Estimated drive times in minutes between Florence-area stores (most are on Mall Rd)
const DRIVE_TIMES: Record<string, number> = {
  start_walmart: 3,
  start_kroger: 3,
  start_aldi: 2,
  start_target: 4,
  start_lidl: 3,
  start_whole_foods: 15,
  walmart_kroger: 1,
  walmart_aldi: 2,
  walmart_target: 2,
  walmart_lidl: 3,
  walmart_whole_foods: 14,
  kroger_aldi: 1,
  kroger_target: 2,
  kroger_lidl: 3,
  kroger_whole_foods: 14,
  aldi_target: 3,
  aldi_lidl: 2,
  aldi_whole_foods: 15,
  target_lidl: 4,
  target_whole_foods: 15,
  lidl_whole_foods: 13,
};

function getDriveTime(from: string, to: string): number {
  const key1 = `${from}_${to}`;
  const key2 = `${to}_${from}`;
  return DRIVE_TIMES[key1] || DRIVE_TIMES[key2] || 5;
}

function buildGoogleMapsUrl(stores: string[]): string {
  const origin = encodeURIComponent(STARTING_POINT.label);
  const destination = encodeURIComponent(STARTING_POINT.label);
  const waypoints = stores
    .filter((s) => FLORENCE_STORES[s])
    .map((s) => encodeURIComponent(FLORENCE_STORES[s].address))
    .join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

const STORE_IMAGES: Record<string, string> = {
  aldi: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=300&fit=crop',
  walmart: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600&h=300&fit=crop',
  kroger: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&h=300&fit=crop',
  target: 'https://images.unsplash.com/photo-1601599561213-832382fd07ba?w=600&h=300&fit=crop',
  whole_foods: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=300&fit=crop',
  lidl: 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?w=600&h=300&fit=crop',
};

// Dynamic coupon generation helper
function generateCouponAlerts(analysis: AnalysisResult) {
  const overchargedItems = analysis.items
    .filter((item) => item.status === 'overcharged' && (item.savings || 0) > 0)
    .sort((a, b) => (b.savings || 0) - (a.savings || 0))
    .slice(0, 3);

  return overchargedItems.map((item) => {
    const storeName = item.bestStore ? (STORE_NAMES[item.bestStore] || item.bestStore) : 'Store';
    const storeColor = item.bestStore ? (STORE_COLORS[item.bestStore]?.primary || '#6c757d') : '#6c757d';
    const badge = item.bestStore ? `${storeName.toUpperCase()} DEAL` : 'DEAL';
    return {
      store: item.bestStore || '',
      badge,
      discount: `$${(item.savings || 0).toFixed(2)} OFF`,
      product: item.matchedItem?.name || item.name,
      desc: `Buy at ${storeName} instead and save $${(item.savings || 0).toFixed(2)} on this item.`,
      badgeColor: storeColor,
    };
  });
}

// Dynamic bulk buy suggestion helper
function generateBulkBuyAlert(analysis: AnalysisResult) {
  const bulkItem = analysis.items.find(
    (item) => item.quantity >= 2 && item.bestStore && (item.savings || 0) > 0
  );
  if (!bulkItem) return null;
  const storeName = bulkItem.bestStore ? (STORE_NAMES[bulkItem.bestStore] || bulkItem.bestStore) : '';
  return {
    name: bulkItem.matchedItem?.name || bulkItem.name,
    qty: bulkItem.quantity,
    store: storeName,
    savings: ((bulkItem.savings || 0)).toFixed(2),
  };
}

export default function SmartSplitTab({ analysis }: { analysis: AnalysisResult }) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const couponAlerts = useMemo(() => generateCouponAlerts(analysis), [analysis]);
  const bulkBuyAlert = useMemo(() => generateBulkBuyAlert(analysis), [analysis]);
  const totalSavings = analysis.totalOptimalSavings;
  const storeCount = analysis.optimalBasket.length;
  const hasOptimal = storeCount > 0;

  const comparisonItems = analysis.items
    .map((item) => {
      const savings = item.savings || 0;
      const isBestDeal = savings > 1.0;
      const isExclusive = item.bestStore === analysis.sourceStore && savings === 0;
      return {
        name: item.matchedItem?.name || item.name,
        details: item.matchedItem?.unit || '',
        originalPrice: item.price * item.quantity,
        optimalPrice: (item.bestPrice || item.price) * item.quantity,
        savings,
        isBestDeal,
        isExclusive,
        bestStore: item.bestStore,
        hasMatch: !!item.matchedItem,
      };
    })
    .sort((a, b) => b.savings - a.savings);

  // Build store filter counts from comparison items
  const storeCounts: Record<string, number> = {};
  for (const item of comparisonItems) {
    if (item.bestStore) {
      storeCounts[item.bestStore] = (storeCounts[item.bestStore] || 0) + 1;
    }
  }
  const filterStores = Object.keys(storeCounts).sort(
    (a, b) => storeCounts[b] - storeCounts[a]
  );

  const filteredComparisonItems = selectedStore
    ? comparisonItems.filter((item) => item.bestStore === selectedStore)
    : comparisonItems;

  const efficiencyScore = Math.round(
    (analysis.bestAlternativeTotal / analysis.totalSpent) * 100
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Hero: Save $X */}
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-5xl lg:text-6xl font-extrabold text-text tracking-tight">
            Save <span className="text-primary">${totalSavings.toFixed(2)}</span>
          </span>
        </div>
        <p className="text-sm font-semibold text-text-tertiary uppercase tracking-editorial">
          BY SPLITTING YOUR SHOP TODAY
        </p>
        <div className="h-1 w-20 bg-primary rounded-full mt-4" />
      </div>

      {/* 3 Gradient Metric Cards */}
      <div
       
       
       
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        <div
          className="rounded-xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0d631b, #15803d)' }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Tooltip text="Best possible total divided by what you paid. 100% means you're already paying the lowest price at every store." />
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Zap size={20} />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-editorial text-white/60 mb-1">
            EFFICIENCY SCORE
          </p>
          <p className="text-2xl font-extrabold">{efficiencyScore}% Optimized</p>
        </div>

        <div
          className="rounded-xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #6e5100, #a16207)' }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Tooltip text="Items where you're paying significantly more than the cheapest available price at another store in your area." />
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Ticket size={20} />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-editorial text-white/60 mb-1">
            SAVINGS ALERTS
          </p>
          <p className="text-2xl font-extrabold">{couponAlerts.length} Active Deal{couponAlerts.length !== 1 ? 's' : ''}</p>
        </div>

        <div
          className="rounded-xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #4c56af, #3730a3)' }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Tooltip text="Number of stores in your area that offer the best price on at least one item from your receipt." />
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-editorial text-white/60 mb-1">
            BEST LOCAL STORES
          </p>
          <p className="text-2xl font-extrabold">{storeCount} Locations</p>
        </div>
      </div>

      {/* The Smart Split Section */}
      <div
       
       
       
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-text">
            The Smart Split
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hasOptimal ? (
            analysis.optimalBasket.slice(0, 3).map((allocation, idx) => {
              const storeColor = STORE_COLORS[allocation.store]?.primary || '#6c757d';
              const storeName = STORE_NAMES[allocation.store] || allocation.store;
              const storeImg = STORE_IMAGES[allocation.store] || STORE_IMAGES.walmart;
              const storeTotal = allocation.items.reduce((s, i) => s + i.price, 0);

              return (
                <div
                  key={allocation.store}
                 
                 
                 
                  className="card-base overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={storeImg}
                      alt={storeName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div
                      className="absolute top-3 left-3 rounded-lg px-3 py-1.5"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span className="text-sm font-bold text-text">
                        ${storeTotal.toFixed(2)} Total
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <StoreLogo storeKey={allocation.store} size={28} />
                        <h3 className="font-bold text-text text-lg">{storeName}</h3>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        Save ${allocation.totalSavings.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {allocation.items.slice(0, 4).map((item, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: storeColor }}
                            />
                            <span className="text-sm text-text-secondary truncate max-w-[180px]">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-text">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {allocation.items.length > 4 && (
                        <p className="text-xs text-text-tertiary pt-1">
                          +{allocation.items.length - 4} more items
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-12 text-text-tertiary">
              No optimal split data available.
            </div>
          )}
        </div>
      </div>

      {/* Route Overview */}
      {hasOptimal && (
        <RouteOverview stores={analysis.optimalBasket.map((a) => a.store)} />
      )}

      {/* Item Comparison + Coupon Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Item Comparison Table */}
        <div
         
         
         
          className="lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-headline text-text">
              Item Comparison
            </h2>
            <span className="text-xs font-semibold bg-surface-low text-text-tertiary px-2.5 py-1 rounded-lg">
              {filteredComparisonItems.length} Items
            </span>
          </div>

          {/* Store Filter Bar */}
          {filterStores.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setSelectedStore(null)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={
                  selectedStore === null
                    ? { backgroundColor: '#4c56af', color: '#fff' }
                    : { backgroundColor: 'rgba(25,28,29,0.04)', color: 'rgba(25,28,29,0.55)' }
                }
              >
                All
                <span className="ml-0.5 text-[10px] opacity-70">{comparisonItems.length}</span>
              </button>
              {filterStores.map((storeKey) => {
                const color = STORE_COLORS[storeKey]?.primary || '#6c757d';
                const name = STORE_NAMES[storeKey] || storeKey;
                const isActive = selectedStore === storeKey;
                return (
                  <button
                    key={storeKey}
                    onClick={() => setSelectedStore(isActive ? null : storeKey)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={
                      isActive
                        ? { backgroundColor: color, color: '#fff' }
                        : { backgroundColor: `${color}10`, color }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isActive ? '#fff' : color }}
                    />
                    {name}
                    <span className="ml-0.5 text-[10px] opacity-70">{storeCounts[storeKey]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="card-base overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-surface-low text-[10px] font-bold text-text-tertiary uppercase tracking-editorial">
              <div className="col-span-3">PRODUCT</div>
              <div className="col-span-2 text-right">YOU PAID</div>
              <div className="col-span-4 text-right">BEST AVAILABLE</div>
              <div className="col-span-3 text-right">SAVINGS</div>
            </div>

            <div>
              {(filteredComparisonItems.length > 15 && !showAllItems
                ? filteredComparisonItems.slice(0, 15)
                : filteredComparisonItems
              ).map((item, i) => {
                const bestStoreColor = item.bestStore ? (STORE_COLORS[item.bestStore]?.primary || '#6c757d') : '#6c757d';
                const bestStoreName = item.bestStore ? (STORE_NAMES[item.bestStore] || item.bestStore) : '';
                return (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-surface-low/50 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-surface-low/20'
                  }`}
                >
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-text">{item.name}</p>
                    {item.details && (
                      <p className="text-[10px] text-text-tertiary mt-0.5">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm text-text-secondary">
                    ${item.originalPrice.toFixed(2)}
                  </div>
                  <div className="col-span-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          item.savings > 0 ? 'text-primary' : 'text-text'
                        }`}
                      >
                        ${item.optimalPrice.toFixed(2)}
                      </span>
                      {bestStoreName && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${bestStoreColor}12`,
                            color: bestStoreColor,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: bestStoreColor }}
                          />
                          {bestStoreName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    {item.isBestDeal ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary-container text-primary px-2.5 py-1 rounded-lg uppercase tracking-editorial">
                        BEST DEAL
                      </span>
                    ) : item.isExclusive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-secondary text-white px-2.5 py-1 rounded-lg uppercase tracking-editorial">
                        EXCLUSIVE
                      </span>
                    ) : item.savings > 0 ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <ArrowDown size={12} />
                        <span className="text-xs font-semibold">
                          -${item.savings.toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {filteredComparisonItems.length > 15 && (
              <button
                onClick={() => setShowAllItems(!showAllItems)}
                className="w-full py-3 text-sm font-semibold text-secondary hover:text-secondary-light hover:bg-surface-low/50 transition-colors border-t border-border/30"
              >
                {showAllItems
                  ? 'Show Less'
                  : `Show All ${filteredComparisonItems.length} Items`}
              </button>
            )}
          </div>
        </div>

        {/* Savings Alerts Sidebar */}
        <div
         
         
         
          className="space-y-5"
        >
          <h2 className="font-headline text-text">
            Savings Alerts
          </h2>

          {couponAlerts.length === 0 ? (
            <div className="card-base p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-3">
                <Tag size={20} className="text-primary" />
              </div>
              <p className="text-sm font-bold text-text">You&apos;re already getting great deals!</p>
              <p className="text-xs text-text-tertiary mt-1">No overcharged items found on this receipt.</p>
            </div>
          ) : (
            <>
              {/* Main Savings Card */}
              <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#fef3c7' }}>
                <span
                  className="inline-block text-[10px] font-bold text-white px-2.5 py-1 rounded-lg uppercase tracking-editorial"
                  style={{ backgroundColor: couponAlerts[0].badgeColor }}
                >
                  {couponAlerts[0].badge}
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-extrabold text-text">
                      {couponAlerts[0].discount}
                    </p>
                    <p className="text-sm font-semibold text-text mt-0.5">
                      {couponAlerts[0].product}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                    <Tag size={18} className="text-text-secondary" />
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {couponAlerts[0].desc}
                </p>
              </div>

              {/* Additional Savings Cards */}
              {couponAlerts.slice(1).map((coupon, i) => (
                <div
                  key={i}
                  className="card-base p-4 flex items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${coupon.badgeColor}10` }}
                  >
                    <Tag size={16} style={{ color: coupon.badgeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{coupon.discount}</p>
                    <p className="text-xs text-text-tertiary truncate">{coupon.product}</p>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md text-white flex-shrink-0"
                    style={{ backgroundColor: coupon.badgeColor }}
                  >
                    {coupon.badge}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Dynamic Bulk Buy Alert */}
          {bulkBuyAlert && (
            <div className="card-base p-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(76,86,175,0.08)' }}>
                <Package size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">Bulk Buy Alert</p>
                <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
                  Buy {bulkBuyAlert.qty} {bulkBuyAlert.name} at {bulkBuyAlert.store} to save ${bulkBuyAlert.savings} today.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Route Overview Component
 * ============================================================ */
function RouteOverview({ stores }: { stores: string[] }) {
  // Filter to stores we have location data for
  const routeStores = stores.filter((s) => FLORENCE_STORES[s]);
  if (routeStores.length === 0) return null;

  // Build route: start → stores → back to start
  const stops: { label: string; address: string; storeKey?: string; driveMin: number }[] = [];

  let prevKey = 'start';
  for (let i = 0; i < routeStores.length; i++) {
    const storeKey = routeStores[i];
    const driveMin = getDriveTime(prevKey, storeKey);
    stops.push({
      label: STORE_NAMES[storeKey] || storeKey,
      address: FLORENCE_STORES[storeKey].address,
      storeKey,
      driveMin,
    });
    prevKey = storeKey;
  }

  const totalDriveMin = stops.reduce((s, stop) => s + stop.driveMin, 0);
  // Rough distance: most Florence stores are within 0.5 mi of each other
  const totalMiles = routeStores.includes('whole_foods')
    ? (routeStores.length - 1) * 0.3 + 8.5
    : routeStores.length * 0.3 + 1.5;

  const mapsUrl = buildGoogleMapsUrl(routeStores);

  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(145deg, #4c56af08, #0d631b08)' }}>
        <div>
          <h2 className="font-headline text-text flex items-center gap-2">
            <Navigation size={18} className="text-secondary" />
            Route Overview
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Optimized route for Florence, KY area
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Clock size={14} />
            <span className="font-semibold">{totalDriveMin} min</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Car size={14} />
            <span className="font-semibold">{totalMiles.toFixed(1)} mi</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-6">
        <div className="relative">
          {/* Starting point */}
          <div className="flex items-start gap-4 mb-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white z-10">
                <MapPin size={14} />
              </div>
              <div className="w-0.5 bg-border flex-1 min-h-[32px]" />
            </div>
            <div className="pt-1 pb-4">
              <p className="text-sm font-bold text-text">Starting Point</p>
              <p className="text-xs text-text-tertiary mt-0.5">{STARTING_POINT.label}</p>
            </div>
          </div>

          {/* Store stops */}
          {stops.map((stop, i) => {
            const storeColor = stop.storeKey ? (STORE_COLORS[stop.storeKey]?.primary || '#6c757d') : '#6c757d';
            const isLast = i === stops.length - 1;
            return (
              <div key={i}>
                {/* Drive time indicator */}
                <div className="flex items-center gap-4 ml-[15px] -mt-1">
                  <div className="w-0.5 bg-border h-4" />
                  <div className="flex items-center gap-1 text-[10px] text-text-tertiary font-semibold uppercase tracking-editorial pl-[22px]">
                    <Car size={10} />
                    {stop.driveMin} min drive
                  </div>
                </div>

                {/* Store stop */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold z-10"
                      style={{ backgroundColor: storeColor }}
                    >
                      {i + 1}
                    </div>
                    {!isLast && <div className="w-0.5 bg-border flex-1 min-h-[32px]" />}
                  </div>
                  <div className="pt-1 pb-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stop.storeKey && <StoreLogo storeKey={stop.storeKey} size={20} />}
                        <p className="text-sm font-bold text-text">{stop.label}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${storeColor}12`, color: storeColor }}
                      >
                        STOP {i + 1}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">{stop.address}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Google Maps link */}
      <div className="px-6 py-4 bg-surface-low flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <CircleDot size={14} className="text-secondary" />
            <span className="font-semibold">{routeStores.length} stops</span>
          </span>
          <span className="text-text-tertiary">•</span>
          <span className="font-semibold">~{totalDriveMin} min total drive</span>
          <span className="text-text-tertiary">•</span>
          <span className="font-semibold">{totalMiles.toFixed(1)} miles</span>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary-light transition-colors"
        >
          <ExternalLink size={14} />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
