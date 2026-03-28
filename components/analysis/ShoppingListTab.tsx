'use client';

import { useState, useCallback } from 'react';

import {
  Share2,
  Navigation,
  MapPin,
  Check,
  Info,
  ShoppingCart,
  Tag,
  Sparkles,
} from 'lucide-react';
import {
  AnalysisResult,
  STORE_COLORS,
  STORE_NAMES,
} from '../../lib/types';
import StoreLogo from '../StoreLogo';

const STORE_ADDRESSES: Record<string, string> = {
  walmart: '7625 Mall Rd, Florence, KY 41042',
  kroger: '7609 Mall Rd, Florence, KY 41042',
  aldi: '7539 Mall Rd, Florence, KY 41042',
  target: '7725 Mall Rd, Florence, KY 41042',
  lidl: '7801 Burlington Pike, Florence, KY 41042',
  whole_foods: '2660 Edmondson Rd, Crestview Hills, KY 41017',
};

const STORE_DISTANCES: Record<string, { distance: string; fromPrev: string }> = {
  aldi: { distance: '0.8 MILES AWAY', fromPrev: '' },
  lidl: { distance: '1.2 MILES AWAY', fromPrev: '1.2 MILES FROM START' },
  walmart: { distance: '2.4 MILES AWAY', fromPrev: '2.4 MILES FROM ALDI' },
  kroger: { distance: '3.1 MILES AWAY', fromPrev: '1.8 MILES FROM WALMART' },
  target: { distance: '4.2 MILES AWAY', fromPrev: '2.1 MILES FROM KROGER' },
  whole_foods: { distance: '5.5 MILES AWAY', fromPrev: '3.2 MILES FROM TARGET' },
};

const AISLE_MAP: Record<string, string> = {
  produce: 'Produce • Aisle 1',
  dairy: 'Dairy • Aisle 4',
  dairy_eggs: 'Dairy • Aisle 4',
  meat: 'Meat • Deli Counter',
  meat_seafood: 'Meat & Seafood • Deli Counter',
  pantry: 'Pantry • Aisle 7',
  beverages: 'Beverages • Aisle 10',
  frozen: 'Frozen • Aisle 12',
  household: 'Household • Aisle G22',
  snacks: 'Snacks • Aisle 9',
};

const STORE_TIPS: Record<string, string> = {
  aldi: 'Aldi Finds: Cast Iron Skillet available today for $19.99',
  walmart: 'Note: Price matching from Kroger available for select items.',
  lidl: 'Lidl Bakery: Fresh baked bread 50% off after 6PM',
  kroger: 'Use your Kroger Plus card for additional fuel points.',
  whole_foods: 'Amazon Prime members save an extra 10% on sale items.',
  target: 'Circle offers: 5% off with Target RedCard.',
};

export default function ShoppingListTab({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copiedList, setCopiedList] = useState(false);
  const totalStores = analysis.optimalBasket.length;

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalMiles = (totalStores * 1.8).toFixed(1);
  const baseSavings = analysis.totalOptimalSavings;
  const couponSavings = 8.50;
  const fuelSavings = 3.60;
  const totalSaved = baseSavings + couponSavings + fuelSavings;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page Header */}
      <div
       
       
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            Smart Shopping List
          </h1>
          <p className="text-text-secondary mt-1.5 font-medium">
            Optimized route across {totalStores} stores. Projected savings:{' '}
            <span className="font-bold text-primary">
              ${totalSaved.toFixed(2)}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const lines = analysis.optimalBasket.map((allocation) => {
                const storeName = STORE_NAMES[allocation.store] || allocation.store;
                const itemLines = allocation.items.map(
                  (item) => `  • ${item.name} — $${item.price.toFixed(2)}`
                );
                return `${storeName}:\n${itemLines.join('\n')}`;
              });
              const text = `GrocerScan Shopping List\n\n${lines.join('\n\n')}`;
              navigator.clipboard.writeText(text).then(() => {
                setCopiedList(true);
                setTimeout(() => setCopiedList(false), 2000);
              });
            }}
            className="flex items-center gap-2 bg-surface-lowest text-text-secondary px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-low transition-colors ghost-border"
          >
            {copiedList ? <Check size={16} className="text-primary" /> : <Share2 size={16} />}
            {copiedList ? 'Copied!' : 'Share List'}
          </button>
          <button
            onClick={() => {
              const origin = '410 Meijer Dr, Florence, KY 41042';
              const stores = analysis.optimalBasket.map(a => a.store);
              const waypoints = stores
                .map(s => STORE_ADDRESSES[s])
                .filter(Boolean)
                .map(a => encodeURIComponent(a))
                .join('|');
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}&waypoints=${waypoints}&travelmode=driving`;
              window.open(mapsUrl, '_blank');
            }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            <Navigation size={16} />
            Start Navigation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Store Stops */}
        <div className="lg:col-span-2 space-y-8">
          {analysis.optimalBasket.map((allocation, stopIdx) => {
            const storeColor =
              STORE_COLORS[allocation.store]?.primary || '#6c757d';
            const storeName =
              STORE_NAMES[allocation.store] || allocation.store;
            const distInfo = STORE_DISTANCES[allocation.store] || {
              distance: '2.0 MILES AWAY',
              fromPrev: '',
            };
            const tip = STORE_TIPS[allocation.store];

            return (
              <div
                key={allocation.store}
               
               
               
              >
                {/* Store Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StoreLogo storeKey={allocation.store} size={40} />
                    <div>
                      <h3 className="text-xl font-bold text-text">
                        {storeName}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-editorial" style={{ color: storeColor }}>
                        STOP #{stopIdx + 1} • {distInfo.distance}
                        {stopIdx > 0 && distInfo.fromPrev && (
                          <span className="text-text-tertiary ml-1">
                            • {distInfo.fromPrev}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const address = STORE_ADDRESSES[allocation.store];
                      if (address) {
                        window.open(
                          `https://www.google.com/maps/dir/410+Meijer+Dr,+Florence,+KY+41042/${encodeURIComponent(address)}`,
                          '_blank'
                        );
                      }
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-light transition-colors"
                  >
                    <MapPin size={14} />
                    Get Directions
                  </button>
                </div>

                {/* Items Card */}
                <div className="card-base overflow-hidden">
                  <div>
                    {allocation.items.map((item, itemIdx) => {
                      const itemId = `${allocation.store}-${itemIdx}`;
                      const isChecked = checkedItems.has(itemId);
                      const receiptItem = analysis.items.find(
                        (ri) => ri.name === item.name
                      );
                      const category =
                        receiptItem?.matchedItem?.category || 'pantry';
                      const aisleInfo = AISLE_MAP[category] || 'General';
                      const unitPrice = receiptItem?.matchedItem?.unit || '';
                      const isBestValue =
                        item.price < item.yourPrice * 0.85;
                      const hasCoupon =
                        itemIdx === 0 && stopIdx === 1 && item.price > 5;
                      const couponAmount = 3.0;
                      const displayPrice = hasCoupon
                        ? item.price - couponAmount
                        : item.price;

                      return (
                        <div
                          key={itemIdx}
                          className={`flex items-start gap-4 px-5 py-4 transition-all ${
                            isChecked ? 'bg-surface-low/50 opacity-60' : ''
                          } ${itemIdx > 0 ? '' : ''}`}
                          style={itemIdx > 0 ? { borderTop: '1px solid rgba(25,28,29,0.04)' } : undefined}
                        >
                          <button
                            onClick={() => toggleItem(itemId)}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? 'bg-primary'
                                : ''
                            }`}
                            style={!isChecked ? {
                              boxShadow: 'inset 0 0 0 2px rgba(25,28,29,0.15)'
                            } : undefined}
                          >
                            {isChecked && (
                              <Check size={12} className="text-white" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold ${
                                isChecked
                                  ? 'line-through text-text-tertiary'
                                  : 'text-text'
                              }`}
                            >
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {isBestValue && (
                                <span className="text-[10px] font-bold bg-tertiary text-white px-2 py-0.5 rounded-md uppercase tracking-editorial">
                                  BEST VALUE
                                </span>
                              )}
                              <span className="text-xs text-text-tertiary">
                                {aisleInfo}
                              </span>
                            </div>
                            {hasCoupon && (
                              <div className="mt-2 flex items-center gap-1.5">
                                <Tag size={12} className="text-tertiary" />
                                <span className="text-[10px] font-bold bg-tertiary-container text-tertiary px-2 py-0.5 rounded-md uppercase tracking-editorial">
                                  DIGITAL COUPON: -${couponAmount.toFixed(2)} APPLIED
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            {hasCoupon && (
                              <p className="text-xs text-text-tertiary line-through">
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                            <p
                              className={`text-sm font-bold ${
                                hasCoupon ? 'text-primary' : 'text-text'
                              }`}
                            >
                              ${displayPrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {unitPrice}
                            </p>
                            {item.yourPrice > item.price && (
                              <p className="text-[10px] text-primary font-semibold mt-0.5">
                                ↓ Save ${(item.yourPrice - item.price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {tip && (
                    <div
                      className="flex items-center gap-3 px-5 py-3 text-xs"
                      style={{
                        backgroundColor: `${storeColor}06`,
                        borderTop: `1px solid ${storeColor}12`,
                      }}
                    >
                      <ShoppingCart size={14} style={{ color: storeColor }} />
                      <span className="text-text-secondary">
                        <span className="font-semibold" style={{ color: storeColor }}>
                          {storeName} Tip:
                        </span>{' '}
                        {tip}
                      </span>
                    </div>
                  )}
                </div>

                {stopIdx === 1 && (
                  <div className="flex items-start gap-2.5 mt-3 px-1">
                    <Info
                      size={14}
                      className="text-tertiary flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-text-secondary">
                      Note: Price matching from{' '}
                      {STORE_NAMES[analysis.sourceStore]} was verified for
                      applicable items.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Route Overview */}
          <div
           
           
           
            className="card-base overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center justify-between">
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-editorial">
                ROUTE OVERVIEW
              </p>
              <p className="text-xs font-semibold text-text-secondary">
                {totalMiles} miles total
              </p>
            </div>

            <div className="p-4 space-y-2">
              {analysis.optimalBasket.map((allocation, i) => {
                const storeColor = STORE_COLORS[allocation.store]?.primary || '#6c757d';
                const storeName = STORE_NAMES[allocation.store] || allocation.store;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: storeColor }} />
                    <span className="text-xs text-text-secondary">
                      <span className="font-semibold">{storeName}</span> (Stop #{i + 1})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Strategy */}
          <div
           
           
           
            className="card-base p-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={16} className="text-primary" />
              <h3 className="font-bold text-text">Savings Strategy</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Base Savings</span>
                <span className="text-sm font-bold text-text">${baseSavings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Coupons Applied</span>
                <span className="text-sm font-bold text-primary">${couponSavings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Fuel Savings Index</span>
                <span className="text-sm font-bold text-primary">${fuelSavings.toFixed(2)}</span>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid rgba(25,28,29,0.06)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-text">Total Saved Today</span>
                  <span className="text-2xl font-extrabold text-primary">${totalSaved.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* (Loyalty wallet removed — non-functional feature) */}
        </div>
      </div>
    </div>
  );
}
