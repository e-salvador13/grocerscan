import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'GrocerScan — The Strategic Grocer',
  description: 'Every receipt is a map to hidden savings. Compare grocery prices across Walmart, Kroger, Target, Whole Foods, Aldi, and Lidl.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface" suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
        <footer className="bg-surface-low mt-20">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="font-extrabold text-primary text-lg tracking-tight">
              GrocerScan
            </div>
            <div className="flex gap-8 text-xs text-text-tertiary uppercase tracking-editorial font-medium">
              <span className="hover:text-text-secondary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-text-secondary cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-text-secondary cursor-pointer transition-colors">Store Partnerships</span>
              <span className="hover:text-text-secondary cursor-pointer transition-colors">Help Center</span>
            </div>
            <div className="text-xs text-text-tertiary">
              © 2025 GrocerScan Intelligence Systems
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
