'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
const motion = { div: "div" as any, button: "button" as any };
import {
  Upload,
  Camera,
  FolderOpen,
  Sparkles,
  ScanSearch,
  BarChart3,
  ShoppingCart,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import StoreLogo from '../components/StoreLogo';

const sampleReceipts = [
  {
    key: 'walmart',
    store: 'Walmart',
    color: '#0071CE',
    total: '$87.42',
    items: 23,
    date: 'Mar 24, 2025',
    tagline: 'Supercenter Run',
  },
  {
    key: 'kroger',
    store: 'Kroger',
    color: '#E31837',
    total: '$94.18',
    items: 19,
    date: 'Mar 22, 2025',
    tagline: 'Weekly Essentials',
  },
  {
    key: 'whole_foods',
    store: 'Whole Foods',
    color: '#00674B',
    total: '$112.55',
    items: 16,
    date: 'Mar 20, 2025',
    tagline: 'Organic Haul',
  },
];

const optimizationSteps = [
  {
    step: 1,
    title: 'Upload',
    desc: 'Submit your paper or digital grocery receipts for analysis.',
    icon: Upload,
  },
  {
    step: 2,
    title: 'Extract',
    desc: 'AI identifies every item, price, and quantity automatically.',
    icon: ScanSearch,
  },
  {
    step: 3,
    title: 'Optimize',
    desc: 'Compare prices across 6 major store chains in real time.',
    icon: BarChart3,
  },
  {
    step: 4,
    title: 'Shop',
    desc: 'Follow your optimized route to maximize every dollar.',
    icon: ShoppingCart,
  },
];

const recentSaves = [
  {
    key: 'whole_foods',
    store: 'Whole Foods Market',
    date: 'Yesterday, 4:12 PM',
    savings: 12.40,
    items: 12,
    color: '#00674B',
  },
  {
    key: 'kroger',
    store: 'Kroger Plaza',
    date: 'Mar 22, 10:30 AM',
    savings: 8.15,
    items: 5,
    color: '#E31837',
  },
  {
    key: 'walmart',
    store: 'Walmart Supercenter',
    date: 'Mar 20, 6:45 PM',
    savings: 34.20,
    items: 28,
    color: '#0071CE',
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSampleClick = (key: string) => {
    router.push(`/processing?receipt=${key}`);
  };

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
  const MAX_SIZE_MB = 10;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const file = files[0];

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      setUploadError('Please upload a photo (JPG, PNG, WebP, HEIC) or PDF.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);

    // Store file info in sessionStorage for the processing page
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem('uploadedReceipt', JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
          timestamp: Date.now(),
        }));
        router.push('/processing?receipt=upload');
      } catch {
        setUploadError('File too large for browser storage. Try a smaller image.');
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d631b 0%, #15803d 40%, #dcfce7 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-14 relative">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div
             
             
             
            >
              <p className="text-xs font-semibold text-white/70 uppercase tracking-editorial mb-3">
                THE STRATEGIC GROCER
              </p>
              <h1
                className="text-4xl lg:text-[3.5rem] font-extrabold text-white tracking-tight leading-[1.1]"
              >
                The Strategist&apos;s<br />Dashboard
              </h1>
              <p className="text-white/70 mt-4 text-lg max-w-md font-medium">
                Every receipt is a map to hidden savings. Optimize your weekly pantry run with precision.
              </p>
            </div>
            <div
             
             
             
              className="text-right lg:pb-2"
            >
              <p className="text-xs font-semibold text-white/60 uppercase tracking-editorial">
                LIFETIME SAVINGS
              </p>
              <p className="text-5xl lg:text-6xl font-extrabold text-white mt-2 tracking-tight">
                $1,248<span className="text-white/60">.42</span>
              </p>
              <div className="flex items-center gap-2 justify-end mt-2">
                <ArrowUpRight size={14} className="text-white/60" />
                <span className="text-sm text-white/60 font-medium">+12.3% this month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload Zone + Samples */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upload Zone */}
            <div
              id="upload"
             
             
             
              className={`card-base p-10 text-center transition-all ${
                isDragOver
                  ? 'ring-2 ring-primary bg-primary-container/30'
                  : ''
              } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
              style={{
                border: '2px dashed',
                borderColor: isDragOver ? '#0d631b' : 'rgba(25, 28, 29, 0.12)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.heic"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(13, 99, 27, 0.08)' }}
              >
                {isUploading ? (
                  <div className="animate-spin">
                    <Upload className="text-primary" size={28} />
                  </div>
                ) : (
                  <Upload className="text-primary" size={28} />
                )}
              </div>
              <h3 className="text-xl font-bold text-text mb-2">
                {isUploading ? 'Processing...' : 'Upload Your Receipt'}
              </h3>
              <p className="text-text-secondary mb-6 max-w-sm mx-auto">
                {isUploading
                  ? 'Reading your receipt file...'
                  : 'Drag and drop your grocery photos or PDFs, or use the buttons below'}
              </p>

              {uploadError && (
                <div className="flex items-center gap-2 justify-center mb-4 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
                >
                  <Camera size={16} />
                  Take Photo
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-surface-lowest text-text-secondary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-low transition-colors ghost-border"
                >
                  <FolderOpen size={16} />
                  Browse Files
                </button>
              </div>
            </div>

            {/* Sample Receipts */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-editorial mb-4">
                DEMO RECEIPTS — TRY ONE
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {sampleReceipts.map((receipt, i) => (
                  <button
                    key={receipt.key}
                   
                   
                   
                    onClick={() => handleSampleClick(receipt.key)}
                    className="card-base p-5 text-left hover:shadow-lg transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <StoreLogo storeKey={receipt.key} size={32} />
                      <div>
                        <span className="font-semibold text-text text-sm block leading-tight">
                          {receipt.store}
                        </span>
                        <span className="text-xs text-text-tertiary">{receipt.tagline}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-text tracking-tight">
                      {receipt.total}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-text-tertiary">
                        {receipt.items} items · {receipt.date}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-text-tertiary group-hover:text-primary transition-colors"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optimization Flow */}
            <div
             
             
             
              className="card-base p-7"
            >
              <div className="flex items-center gap-2.5 mb-6">
                <Sparkles className="text-primary" size={20} />
                <h3 className="font-headline text-text">
                  Optimization Flow
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {optimizationSteps.map((step) => (
                  <div key={step.step} className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                    <h4 className="font-semibold text-text">{step.title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Intelligence + Recent Saves */}
          <div className="space-y-8">
            {/* This Month's Intelligence */}
            <div
             
             
             
              className="rounded-xl p-6 text-white"
              style={{
                background: 'linear-gradient(145deg, #4c56af 0%, #3730a3 100%)',
                boxShadow: '0 20px 40px rgba(76, 86, 175, 0.25)',
              }}
            >
              <h3 className="text-lg font-bold mb-5 text-white/90">
                This Month&apos;s Intelligence
              </h3>
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-editorial">
                    MONTHLY SAVINGS
                  </p>
                  <p className="text-3xl font-extrabold mt-1">$214.50</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-editorial">
                    ITEMS SCANNED
                  </p>
                  <p className="text-3xl font-extrabold mt-1">84</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-white/50 mb-3">
                  <span>Store Loyalty Breakdown</span>
                  <span>Share %</span>
                </div>
                {[
                  { name: 'Walmart', pct: 45, color: '#0071CE' },
                  { name: 'Kroger', pct: 28, color: '#E31837' },
                  { name: 'Whole Foods', pct: 18, color: '#00674B' },
                  { name: 'Aldi', pct: 9, color: '#FF6600' },
                ].map((store) => (
                  <div key={store.name} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-white/70 w-16 font-medium">{store.name}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                       
                        className="h-full rounded-full"
                        style={{ backgroundColor: store.color, width: `${store.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50 w-8 text-right font-medium">
                      {store.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Saves */}
            <div
             
             
             
              className="card-base p-6"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-title text-text">Recent Saves</h3>
                <button className="text-xs font-semibold text-secondary uppercase tracking-editorial hover:text-secondary-light transition-colors">
                  VIEW ALL
                </button>
              </div>
              <div className="space-y-1">
                {recentSaves.map((save, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 cursor-pointer hover:bg-surface-low rounded-xl p-3 -mx-1 transition-colors"
                  >
                    <StoreLogo storeKey={save.key} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {save.store}
                      </p>
                      <p className="text-xs text-text-tertiary">{save.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        +${save.savings.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-editorial">
                        {save.items} ITEMS
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
