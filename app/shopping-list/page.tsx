'use client';


import { ShoppingCart } from 'lucide-react';

export default function ShoppingListPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div
         
         
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight mb-3">
            Shopping List
          </h1>
          <p className="text-text-secondary max-w-md mx-auto mb-8">
            Your optimized shopping list appears here after analyzing a receipt. Try a demo receipt to see it in action.
          </p>
          <div className="card-base p-12 max-w-lg mx-auto">
            <ShoppingCart size={48} className="text-text-tertiary mx-auto mb-4" />
            <p className="text-text-tertiary">Analyze a receipt to generate your smart shopping list.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
