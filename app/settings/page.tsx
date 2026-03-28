'use client';


import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div
         
         
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center mx-auto mb-6">
            <Settings size={28} className="text-secondary" />
          </div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight mb-3">
            Settings
          </h1>
          <p className="text-text-secondary max-w-md mx-auto">
            Configure your preferred stores, notification preferences, and account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
