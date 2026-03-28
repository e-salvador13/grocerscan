'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CheckCircle, Loader, BarChart3, FileText, ScanSearch, FileCheck } from 'lucide-react';

const steps = [
  {
    id: 'scan',
    title: 'Scanning Receipt',
    desc: 'OCR extraction and text recognition complete.',
    icon: ScanSearch,
    duration: 1200,
  },
  {
    id: 'classify',
    title: 'Classifying Items',
    desc: 'Items mapped to grocery categories.',
    icon: FileText,
    duration: 1000,
  },
  {
    id: 'compare',
    title: 'Comparing Prices',
    desc: 'Evaluating prices against 6 store benchmarks...',
    icon: BarChart3,
    duration: 1500,
  },
  {
    id: 'report',
    title: 'Generating Report',
    desc: 'Building savings analysis and optimization plan.',
    icon: FileCheck,
    duration: 800,
  },
];

const storeConfig: Record<string, { name: string; color: string }> = {
  walmart: { name: 'Walmart', color: '#0071CE' },
  kroger: { name: 'Kroger', color: '#E31837' },
  whole_foods: { name: 'Whole Foods', color: '#00674B' },
  upload: { name: 'Your Receipt', color: '#0d631b' },
};

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receipt = searchParams.get('receipt') || 'walmart';
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const store = storeConfig[receipt] || storeConfig.walmart;

  useEffect(() => {
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const target = ((stepIndex + 1) / steps.length) * 100;
        if (prev >= target) return prev;
        return prev + 1;
      });
    }, 40);

    const advanceStep = () => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
        setTimeout(advanceStep, steps[stepIndex].duration);
      } else {
        setTimeout(() => {
          router.push(`/analysis?receipt=${receipt}`);
        }, 600);
      }
    };

    setTimeout(advanceStep, steps[0].duration);

    return () => clearInterval(progressInterval);
  }, [receipt, router]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Header */}
        <div
         
         
          className="mb-12"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-editorial mb-3">
            PROCESSING INTELLIGENCE
          </p>
          <h1 className="text-4xl lg:text-[3rem] font-extrabold text-text tracking-tight leading-tight">
            Scanning your{' '}
            <span style={{ color: store.color }}>
              {store.name}
            </span>{' '}
            receipt
          </h1>
          <p className="text-text-secondary mt-3 text-lg max-w-xl font-medium">
            Cross-referencing your items against market prices at 6 stores to surface cost-saving opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Receipt Card */}
          <div
           
           
           
            className="card-base p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: store.color }}
              >
                {store.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-editorial font-medium">
                  RECEIPT
                </p>
                <p className="font-bold text-text">
                  {store.name} Receipt
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs mb-2.5">
                <span className="text-text-tertiary uppercase tracking-editorial font-semibold">
                  SCANNING DATA LAYERS
                </span>
                <span className="font-bold text-secondary">{Math.min(progress, 100)}% COMPLETE</span>
              </div>
              <div className="h-3 bg-surface-low rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: store.color, width: `${Math.min(progress, 100)}%`, transition: 'width 0.3s ease' }}
                />
              </div>
            </div>

            {/* Simulated receipt lines */}
            <div className="mt-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                 
                 
                  className="flex justify-between"
                >
                  <div
                    className="h-3.5 bg-surface-low rounded"
                    style={{ width: `${45 + Math.sin(i * 2.1) * 25}%` }}
                  />
                  <div
                    className="h-3.5 bg-surface-low rounded"
                    style={{ width: '15%' }}
                  />
                </div>
              ))}
              <div className="pt-3 mt-3" style={{ borderTop: '1px dashed rgba(25,28,29,0.1)' }}>
                <div className="flex justify-between">
                  <div className="h-4 bg-surface-low rounded w-20" />
                  <div
                    className="h-4 rounded w-24"
                   
                   
                    style={{ backgroundColor: `${store.color}20` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Steps Checklist */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-headline text-text">
                Analysis Progress
              </h3>
              <span className="text-3xl font-extrabold text-secondary">
                {Math.min(Math.round(progress), 100)}%
              </span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="flex gap-1.5 mb-8">
              {steps.map((_, i) => (
                <div key={i} className="flex-1 h-2.5 bg-surface-low rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{
                      width: i < currentStep ? '100%' : i === currentStep ? '60%' : '0%',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Step items */}
            <div className="space-y-3">
              
                {steps.map((step, i) => {
                  const isComplete = i < currentStep;
                  const isCurrent = i === currentStep;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.id}
                     
                     
                     
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isCurrent
                          ? 'card-base'
                          : isComplete
                          ? 'bg-surface-lowest ghost-border'
                          : 'bg-surface-low'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isComplete
                            ? 'bg-primary-container text-primary'
                            : isCurrent
                            ? 'bg-secondary text-white'
                            : 'bg-surface text-text-tertiary'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle size={20} />
                        ) : isCurrent ? (
                          <div
                           
                           
                          >
                            <Loader size={20} />
                          </div>
                        ) : (
                          <Icon size={20} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-semibold text-sm ${
                            isCurrent ? 'text-secondary' : isComplete ? 'text-text' : 'text-text-tertiary'
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">{step.desc}</p>
                      </div>
                      {isComplete && (
                        <span className="text-xs font-semibold text-primary uppercase tracking-editorial">
                          DONE
                        </span>
                      )}
                      {isCurrent && (
                        <div
                         
                         
                          className="text-secondary font-bold"
                        >
                          •••
                        </div>
                      )}
                    </div>
                  );
                })}
              
            </div>

            {/* Info banner */}
            <div
             
             
             
              className="mt-8 rounded-xl p-4 flex gap-3"
              style={{ backgroundColor: 'rgba(76, 86, 175, 0.06)' }}
            >
              <div className="text-secondary mt-0.5 text-lg">ℹ️</div>
              <p className="text-sm text-text-secondary">
                Large receipts (50+ items) may take a moment. You can safely
                navigate away — we&apos;ll notify you when your report is ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div
         
         
        >
          <Loader size={32} className="text-secondary" />
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
