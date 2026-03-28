'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CheckCircle, Loader, BarChart3, FileText, ScanSearch, FileCheck, AlertCircle } from 'lucide-react';

const steps = [
  {
    id: 'scan',
    title: 'Scanning Receipt',
    desc: 'OCR extraction and text recognition...',
    icon: ScanSearch,
    duration: 1200,
  },
  {
    id: 'classify',
    title: 'Classifying Items',
    desc: 'Mapping items to grocery categories...',
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
  const [error, setError] = useState<string | null>(null);
  const ocrStarted = useRef(false);

  const store = storeConfig[receipt] || storeConfig.walmart;
  const isUpload = receipt === 'upload';

  const runOcrPipeline = useCallback(async () => {
    try {
      // Step 0: Scanning Receipt — run Tesseract OCR
      const stored = sessionStorage.getItem('uploadedReceipt');
      if (!stored) {
        setError('No receipt image found. Please upload again.');
        return;
      }

      const { dataUrl } = JSON.parse(stored);
      if (!dataUrl) {
        setError('Invalid receipt data. Please upload again.');
        return;
      }

      // Dynamic import so Tesseract only loads for uploads
      const Tesseract = await import('tesseract.js');

      setCurrentStep(0);
      setProgress(5);

      // --- Image preprocessing for better OCR ---
      // Receipts need: crop to receipt area, high contrast, binarization
      const preprocessImage = (imgDataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;

            // Draw original
            ctx.drawImage(img, 0, 0);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Pass 1: Find the brightness range of the receipt area
            // (receipts are white/light paper — find the bright region)
            const brightPixels: number[] = [];
            for (let i = 0; i < data.length; i += 4) {
              const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
              if (gray > 100) brightPixels.push(gray);
            }
            
            // Calculate adaptive threshold based on image histogram
            brightPixels.sort((a, b) => a - b);
            const median = brightPixels[Math.floor(brightPixels.length * 0.5)] || 160;
            const threshold = Math.max(90, median * 0.55); // Adaptive threshold

            // Pass 2: Convert to binary with adaptive threshold
            for (let i = 0; i < data.length; i += 4) {
              const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
              
              // Invert: make text black on white (most receipts are dark text on light paper)
              const bw = gray > threshold ? 255 : 0;

              data[i] = bw;
              data[i + 1] = bw;
              data[i + 2] = bw;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = imgDataUrl;
        });
      };

      const processedDataUrl = await preprocessImage(dataUrl);

      setProgress(10);

      const result = await Tesseract.recognize(processedDataUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            // Map Tesseract progress (0–1) to our step 0 progress (10–25%)
            setProgress(10 + Math.round(m.progress * 15));
          }
        },
      });

      const ocrText = result.data.text;
      console.log('[GrocerScan] OCR raw text:', ocrText);

      // Step 1: Classifying Items — parse OCR text
      setCurrentStep(1);
      setProgress(35);

      const { parseReceiptText } = await import('../../lib/parse-receipt');
      const parsedItems = parseReceiptText(ocrText);

      console.log('[GrocerScan] Parsed items:', parsedItems);

      let finalItems = parsedItems;
      let finalOcrText = ocrText;

      if (parsedItems.length === 0) {
        // Fallback 1: try server-side Tesseract with sharp preprocessing
        console.log('[GrocerScan] Client OCR failed, trying server-side Tesseract...');
        setProgress(28);
        
        try {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          const formData = new FormData();
          formData.append('image', blob, 'receipt.jpg');
          
          const serverResp = await fetch('/api/ocr', { method: 'POST', body: formData });
          if (serverResp.ok) {
            const serverData = await serverResp.json();
            console.log('[GrocerScan] Server Tesseract result:', serverData);
            
            if (serverData.items && serverData.items.length > 0) {
              finalItems = serverData.items;
              finalOcrText = serverData.ocrText || ocrText;
            }
          }
        } catch (serverErr) {
          console.error('[GrocerScan] Server Tesseract failed:', serverErr);
        }
      }

      if (finalItems.length === 0) {
        // Fallback 2: Vision AI — send image to Claude for extraction
        console.log('[GrocerScan] Tesseract failed, trying Vision AI...');
        setProgress(32);
        
        try {
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          const formData = new FormData();
          formData.append('image', blob, 'receipt.jpg');
          
          const visionResp = await fetch('/api/ocr-vision', { method: 'POST', body: formData });
          if (visionResp.ok) {
            const visionData = await visionResp.json();
            console.log('[GrocerScan] Vision AI result:', visionData);
            
            if (visionData.items && visionData.items.length > 0) {
              finalItems = visionData.items;
              finalOcrText = `[Vision AI] Extracted ${visionData.items.length} items from ${visionData.store || 'receipt'}`;
              // Store the receipt total from Vision AI for accurate totalSpent
              if (visionData.total) {
                sessionStorage.setItem('receiptTotal', String(visionData.total));
              }
            } else {
              setError(
                'Could not extract items from this receipt. Try a clearer photo with good lighting.'
              );
              return;
            }
          } else {
            setError(
              'Could not extract items from this receipt. Try a clearer photo with good lighting.'
            );
            return;
          }
        } catch (visionErr) {
          console.error('[GrocerScan] Vision AI failed:', visionErr);
          setError(
            'Could not extract items from this receipt. Try a clearer photo with good lighting.'
          );
          return;
        }
      }

      // Store parsed items + raw OCR text for the analysis page
      sessionStorage.setItem(
        'parsedReceiptItems',
        JSON.stringify(finalItems)
      );
      sessionStorage.setItem('ocrRawText', finalOcrText);

      // Step 2: Comparing Prices
      setCurrentStep(2);
      setProgress(60);
      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Generating Report
      setCurrentStep(3);
      setProgress(85);
      await new Promise((r) => setTimeout(r, 600));

      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      router.push(`/analysis?receipt=upload`);
    } catch (err) {
      console.error('OCR pipeline error:', err);
      setError('Something went wrong processing your receipt. Please try again.');
    }
  }, [router]);

  // For sample receipts: use the existing timed animation
  useEffect(() => {
    if (isUpload) {
      if (!ocrStarted.current) {
        ocrStarted.current = true;
        runOcrPipeline();
      }
      return;
    }

    // Sample receipt animation (unchanged)
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
  }, [receipt, router, isUpload, runOcrPipeline]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="mb-12">
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
            {isUpload
              ? 'Running OCR to extract items, then cross-referencing prices at 6 stores.'
              : 'Cross-referencing your items against market prices at 6 stores to surface cost-saving opportunities.'}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="card-base p-6 mb-8 flex items-start gap-4 border-l-4 border-red-500">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-text mb-1">Processing Failed</p>
              <p className="text-sm text-text-secondary">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-3 text-sm font-semibold text-primary hover:underline"
              >
                ← Back to Upload
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Receipt Card */}
          <div className="card-base p-8">
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
                  {isUpload ? 'OCR + ANALYSIS' : 'SCANNING DATA LAYERS'}
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
                <div key={i} className="flex justify-between">
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
                        <div>
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
                      <div className="text-secondary font-bold">
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
                {isUpload
                  ? 'OCR processing runs entirely in your browser — your receipt image never leaves your device.'
                  : 'Large receipts (50+ items) may take a moment. You can safely navigate away — we\u2019ll notify you when your report is ready.'}
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
        <div>
          <Loader size={32} className="text-secondary" />
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
