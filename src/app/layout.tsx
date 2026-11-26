import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../locales/i18n';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'HearthShift AI — Home Energy & Tariff Assistant',
  description:
    'Clear electricity bill tracking, tariff threshold alerts, and conservative modeled recommendations running locally in your browser.',
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
      <body className="min-h-screen flex flex-col bg-[#F9FAFB] text-zinc-900 antialiased selection:bg-emerald-600 selection:text-white">
        <LanguageProvider>
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {children}
          </main>
          <footer className="border-t border-zinc-200/80 bg-white py-5 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
              <span>HearthShift AI · Local-first household energy assistant</span>
              <span>Experimental alpha · Modeled estimates only · 100% on-device IndexedDB</span>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
