'use client';


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
} from 'lucide-react';
import {
  AnalysisResult,
  STORE_COLORS,
  STORE_NAMES,
} from '../../lib/types';
import StoreLogo from '../StoreLogo';

const STORE_IMAGES: Record<string, string> = {
  aldi: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=300&fit=crop',
  walmart: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600&h=300&fit=crop',
  kroger: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&h=300&fit=crop',
  target: 'https://images.unsplash.com/photo-1601599561213-832382fd07ba?w=600&h=300&fit=crop',
  whole_foods: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=300&fit=crop',
  lidl: 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?w=600&h=300&fit=crop',
};

const COUPON_ALERTS = [
  {
    store: 'lidl',
    badge: 'LIDL DEAL',
    discount: '$1.00 OFF',
    product: "Nature's Own Bread",
    desc: 'Available via the Lidl app. Scanned and verified by GrocerScan AI for your local store.',
    badgeColor: '#0050AA',
  },
  {
    store: 'aldi',
    badge: 'ALDI FIND',
    discount: '$0.50 OFF',
    product: 'Frozen Broccoli (16oz)',
    desc: 'Weekly special. Valid through end of week.',
    badgeColor: '#00005F',
  },
  {
    store: 'walmart',
    badge: 'ROLLBACK',
    discount: '$2.00 OFF',
    product: 'Paper Towels (6pk)',
    desc: 'Walmart Rollback pricing. In-store and online.',
    badgeColor: '#0071CE',
  },
];

export default function SmartSplitTab({ analysis }: { analysis: AnalysisResult }) {
  const totalSavings = analysis.totalOptimalSavings;
  const storeCount = analysis.optimalBasket.length;
  const hasOptimal = storeCount > 0;

  const comparisonItems = analysis.items
    .filter((item) => item.matchedItem)
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
      };
    })
    .sort((a, b) => b.savings - a.savings);

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
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Zap size={20} />
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
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Ticket size={20} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-editorial text-white/60 mb-1">
            COUPON ALERTS
          </p>
          <p className="text-2xl font-extrabold">3 Active Deals</p>
        </div>

        <div
          className="rounded-xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #4c56af, #3730a3)' }}
        >
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <MapPin size={20} />
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
          <button className="flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary-light transition-colors">
            <Navigation size={14} />
            Optimize Route
          </button>
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
              {comparisonItems.length} Items
            </span>
          </div>

          <div className="card-base overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-surface-low text-[10px] font-bold text-text-tertiary uppercase tracking-editorial">
              <div className="col-span-4">PRODUCT</div>
              <div className="col-span-2 text-right">ORIGINAL</div>
              <div className="col-span-3 text-right">OPTIMAL</div>
              <div className="col-span-3 text-right">STATUS</div>
            </div>

            <div>
              {comparisonItems.slice(0, 10).map((item, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-surface-low/50 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-surface-low/20'
                  }`}
                >
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-text">{item.name}</p>
                    <p className="text-xs text-text-tertiary">{item.details}</p>
                  </div>
                  <div className="col-span-2 text-right text-sm text-text-secondary">
                    ${item.originalPrice.toFixed(2)}
                  </div>
                  <div
                    className={`col-span-3 text-right text-sm font-semibold ${
                      item.savings > 0 ? 'text-primary' : 'text-text'
                    }`}
                  >
                    ${item.optimalPrice.toFixed(2)}
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
                          ${item.savings.toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coupon Alerts Sidebar */}
        <div
         
         
         
          className="space-y-5"
        >
          <h2 className="font-headline text-text">
            Coupon Alerts
          </h2>

          {/* Main Coupon Card */}
          <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#fef3c7' }}>
            <span
              className="inline-block text-[10px] font-bold text-white px-2.5 py-1 rounded-lg uppercase tracking-editorial"
              style={{ backgroundColor: COUPON_ALERTS[0].badgeColor }}
            >
              {COUPON_ALERTS[0].badge}
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold text-text">
                  {COUPON_ALERTS[0].discount}
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {COUPON_ALERTS[0].product}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                <Tag size={18} className="text-text-secondary" />
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {COUPON_ALERTS[0].desc}
            </p>
            <button
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: COUPON_ALERTS[0].badgeColor }}
            >
              Clip Coupon
            </button>
          </div>

          {/* Additional Coupon Cards */}
          {COUPON_ALERTS.slice(1).map((coupon, i) => (
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

          {/* Bulk Buy Alert */}
          <div className="card-base p-4 flex gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(76,86,175,0.08)' }}>
              <Package size={16} className="text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">Bulk Buy Alert</p>
              <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
                Buy 2 Water 24pks at Aldi to save an extra $2.00 today.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
