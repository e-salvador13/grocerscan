'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { FileText, Scissors, ShoppingCart, AlertTriangle, TrendingDown } from 'lucide-react';
import { sampleReceipts, SampleReceiptKey } from '../lib/sample-receipts';
import { STORE_COLORS, AnalysisResult } from '../lib/types';
import { analyzeReceiptItems, ParsedReceiptInput } from '../lib/match-items';
import ReportTab from './analysis/ReportTab';
import SmartSplitTab from './analysis/SmartSplitTab';
import ShoppingListTab from './analysis/ShoppingListTab';

const tabs = [
  { id: 'report', label: 'Analysis Report', icon: FileText },
  { id: 'split', label: 'Smart Split', icon: Scissors },
  { id: 'list', label: 'Shopping List', icon: ShoppingCart },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AnalysisContent() {
  const searchParams = useSearchParams();
  const receiptParam = searchParams.get('receipt') || 'walmart';
  const isUpload = receiptParam === 'upload';
  const receiptKey = receiptParam as SampleReceiptKey;
  const initialTab = (searchParams.get('tab') as TabId) || 'report';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [uploadAnalysis, setUploadAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // For uploaded receipts: read parsed items from sessionStorage and analyze
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
      const result = analyzeReceiptItems(parsedItems);
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
      {/* Header */}
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
