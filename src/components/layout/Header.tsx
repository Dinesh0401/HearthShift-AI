'use client';

import React from 'react';
import { useLanguage } from '../../locales/i18n';
import { ShieldCheck, Globe, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="border-b border-zinc-200/90 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <Zap className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 truncate">
              {t('appName')}
            </h1>
            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              alpha
            </span>
          </div>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs font-medium whitespace-nowrap"
            title="All computation and data storage stay strictly inside browser IndexedDB. Zero external telemetry."
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">{t('privacyBadge')}</span>
            <span className="sm:hidden">{t('privacyBadgeShort')}</span>
          </div>

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 text-xs font-medium transition-colors whitespace-nowrap"
            aria-label="Toggle language between English and Tamil"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
