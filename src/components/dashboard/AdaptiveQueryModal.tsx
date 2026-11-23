'use client';

import React from 'react';
import type { AdaptiveQuestion } from '../../types/contracts';
import { useLanguage } from '../../locales/i18n';
import { HelpCircle, Shield, X, Check, ArrowRight } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{t('adaptiveQuestionTitle')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">EVSI Decision Gate Active</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Text */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-sm font-semibold text-gray-900 leading-relaxed">
          {question.text[language] ?? question.text.en}
        </div>

        <p className="text-xs text-gray-600 leading-normal">
          {t('adaptiveQuestionSubtitle')}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onAnswer(1)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            {t('btnFlexible')}
          </button>

          <button
            type="button"
            onClick={() => onAnswer(-1)}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
            {t('btnSensitive')}
          </button>

          <button
            type="button"
            onClick={() => onAnswer(0)}
            className="w-full py-2 px-4 text-gray-500 hover:text-gray-700 text-xs font-medium text-center transition-colors"
          >
            {t('btnSkip')}
          </button>
        </div>

        {/* Privacy Invariant Footer */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Answers stay 100% on your device in IndexedDB. Zero cloud transmission.</span>
        </div>
      </div>
    </div>
  );
};
