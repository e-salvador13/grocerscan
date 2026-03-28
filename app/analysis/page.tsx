'use client';

import { Suspense } from 'react';
import AnalysisContent from '../../components/AnalysisContent';

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy" />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
