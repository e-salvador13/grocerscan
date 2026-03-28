'use client';

import { useState } from 'react';
import { STORE_LOGOS, STORE_COLORS } from '../lib/types';

interface StoreLogoProps {
  storeKey: string;
  size?: number;
  className?: string;
}

export default function StoreLogo({ storeKey, size = 32, className = '' }: StoreLogoProps) {
  const [imgError, setImgError] = useState(false);
  const logoSrc = STORE_LOGOS[storeKey];
  const storeColor = STORE_COLORS[storeKey]?.primary || '#6c757d';
  const storeName = STORE_COLORS[storeKey]?.name || storeKey;

  if (!logoSrc || imgError) {
    // Fallback: colored letter square
    return (
      <div
        className={`flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        style={{
          backgroundColor: storeColor,
          width: size,
          height: size,
          borderRadius: size * 0.25,
          fontSize: size * 0.375,
        }}
      >
        {storeName.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={`${storeName} logo`}
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        objectFit: 'cover',
      }}
      onError={() => setImgError(true)}
    />
  );
}
