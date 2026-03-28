'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, User, Upload } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-4 z-50 mx-auto max-w-7xl px-4"
      style={{ marginTop: '1rem' }}
    >
      <div
        className="flex items-center justify-between h-14 px-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(25, 28, 29, 0.06), inset 0 0 0 1px rgba(25, 28, 29, 0.06)',
        }}
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="font-extrabold text-xl text-primary tracking-tight">
            GrocerScan
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-primary bg-primary-container/60'
                      : 'text-text-secondary hover:text-text hover:bg-surface-low'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Upload + Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/#upload"
            className="hidden sm:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            <Upload size={15} />
            Upload Receipt
          </Link>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-surface-low transition-all">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        </div>
      </div>
    </nav>
  );
}
