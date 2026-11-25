import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../locales/i18n';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'HearthShift AI — Privacy-First Home Energy Intelligence',
  description:
    'Decision-aware, privacy-minimal energy intelligence for households. Local-first IndexedDB computation, deterministic tariff engine, and conservative optimization.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        <LanguageProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-600 px-4">
            <p>
              HearthShift AI · Decision-Aware, Privacy-Minimal Household Energy Assistant
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Experimental Research Alpha · Not Utility-Certified or Guaranteed Savings · 100% On-Device IndexedDB
            </p>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
