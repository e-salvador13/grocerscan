'use client';


import { MapPin, TrendingDown } from 'lucide-react';

export default function SavingsMapPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div
         
         
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-6">
            <MapPin size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight mb-3">
            Savings Map
          </h1>
          <p className="text-text-secondary max-w-md mx-auto mb-8">
            Your personalized savings map is built from your receipt history. Upload your first receipt to start mapping.
          </p>
          <div className="card-base p-12 max-w-lg mx-auto">
            <TrendingDown size={48} className="text-text-tertiary mx-auto mb-4" />
            <p className="text-text-tertiary">Upload receipts to populate your savings map.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
