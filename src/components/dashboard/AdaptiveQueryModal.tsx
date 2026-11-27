'use client';

import React, { useEffect } from 'react';
import type { AdaptiveQuestion } from '../../types/contracts';
import { useLanguage } from '../../locales/i18n';
import { HelpCircle, Shield, X, Check } from 'lucide-react';

interface AdaptiveQueryModalProps {
  question: AdaptiveQuestion;
  onAnswer: (responseValue: 1 | -1 | 0) => void;
  onClose: () => void;
}

export const AdaptiveQueryModal: React.FC<AdaptiveQueryModalProps> = ({
  question,
  onAnswer,
  onClose,
}) => {
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-[2px] animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-query-modal-title"
        className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-md w-full p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-100 text-zinc-700 rounded-xl flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="adaptive-query-modal-title" className="text-base font-semibold text-zinc-900">
                {t('adaptiveQuestionTitle')}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{t('adaptiveQuestionSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question modal"
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 text-sm font-medium text-zinc-900 leading-relaxed">
          {question.text[language] ?? question.text.en}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onAnswer(1)}
            className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            {t('btnFlexible')}
          </button>

          <button
            type="button"
            onClick={() => onAnswer(-1)}
            className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
            {t('btnSensitive')}
          </button>

          <button
            type="button"
            onClick={() => onAnswer(0)}
            className="w-full min-h-[40px] py-2 px-4 text-zinc-500 hover:text-zinc-800 text-xs font-medium text-center transition-colors"
          >
            {t('btnSkip')}
          </button>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{t('offlineStatus')} · {t('privacyBadge')}</span>
        </div>
      </div>
    </div>
  );
};
