import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../locales/i18n';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'HearthShift AI — Privacy-First Home Energy Intelligence',
  description:
    'Decision-aware, privacy-minimal energy intelligence for households. Local-first IndexedDB computation, deterministic tariff engine, and conservative optimization.',
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
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <p>
              HearthShift AI · Decision-Aware, Privacy-Minimal Household Energy Assistant
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Deterministic Tariff Engine · 100% On-Device IndexedDB · Zero Cloud Telemetry
            </p>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
