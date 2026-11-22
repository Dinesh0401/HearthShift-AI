'use client';

import React from 'react';
import { useLanguage } from '../../locales/i18n';
import { ShieldCheck, WifiOff, Globe, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                {t('appName')}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                v0.1.0-alpha
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Privacy Sovereign Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
            title="All computation and data persistence runs 100% on-device in browser IndexedDB. Zero telemetry sent to external servers."
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t('privacyBadge')}</span>
            <span className="sm:hidden">100% On-Device</span>
          </div>

          {/* Offline Ready Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs">
            <WifiOff className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>{t('offlineStatus')}</span>
          </div>

          {/* Bilingual Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-sm transition-colors"
            aria-label="Toggle language between English and Tamil"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'en' ? 'தமிழ் (TA)' : 'English (EN)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
