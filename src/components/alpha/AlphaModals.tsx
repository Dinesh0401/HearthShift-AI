'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Check, ExternalLink, Mail, FileText, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import { sanitizePlainTextInput } from '../../core/ingestion/manual-bill';
import { useLanguage } from '../../locales/i18n';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="changelog-modal-title" className="text-base font-bold text-gray-900">
                {t('changelogTitle')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('changelogSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalBtn')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-emerald-950">v0.1.0-alpha (Phase 4A / 4B Candidate)</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                2026-11-25
              </span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-emerald-900">
              <li>Integer-paise TNPDCL LT-1A (May 2026, 2025–2026, 2024–2025) &amp; generic Flat / TOU tariff selector.</li>
              <li>TR-VOI chance-constrained advisor with multi-tariff exact piecewise moments &amp; Python parity verification.</li>
              <li>Progressive capability gating (<code>BASIC</code> / <code>INTERVAL</code> / <code>OPTIMIZATION_ELIGIBLE</code>) &amp; bounded 25 MB CSV ingestion.</li>
              <li>Safe Synthetic Demo Mode (3 bills, 192h hourly data, 0 fake verified savings) &amp; 4-tier provenance ledger.</li>
              <li>Static Next.js export compatibility (<code>out/</code>), strict CSP headers, and bilingual English / Tamil UI.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
            <p className="font-bold text-amber-950">Explicitly Not Implemented Yet</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-900">
              <li>
                <strong>No Offline Service Worker Caching:</strong> <code>manifest.json</code> provides app metadata only; opening or reloading requires network access to the host (open sessions compute locally in IndexedDB).
              </li>
              <li>
                <strong>No IPMVP Option C / ASHRAE 14 Certification:</strong> Modeled and user-reported figures are not calibrated M&amp;V baselines.
              </li>
              <li>
                <strong>No Human Field Study Results Yet:</strong> Stage 1 (N = 5–10) and Stage 2 RCT (N = 152–160) are pre-pilot protocols only.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            {t('closeModalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AlphaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTariffId: string;
}

type FeedbackCategory = 'usability' | 'tariff_bug' | 'region_request' | 'research_mv';

export const AlphaFeedbackModal: React.FC<AlphaFeedbackModalProps> = ({
  isOpen,
  onClose,
  activeTariffId,
}) => {
  const { language, t } = useLanguage();
  const [category, setCategory] = useState<FeedbackCategory>('usability');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [externalConsent, setExternalConsent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Strictly builds feedback payload from form state only — NEVER accesses IndexedDB (`db`).
  const sanitizedNotes = sanitizePlainTextInput(notes, 1000);
  const scrubbedPayload = {
    schema: 'hearthshift_alpha_feedback_v1',
    version: 'v0.1.0-alpha',
    createdAt: new Date().toISOString().slice(0, 10),
    uiLanguage: language,
    selectedTariffId: activeTariffId,
    category,
    experienceRating: rating,
    comments: sanitizedNotes,
    privacyGuarantees: {
      householdBillsIncluded: 0,
      intervalReadingsIncluded: 0,
      consumerReferencesIncluded: 0,
      savingsRecordsIncluded: 0,
      transmittedAutomatically: false,
    },
  };

  const payloadJson = JSON.stringify(scrubbedPayload, null, 2);

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(payloadJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadDraft = () => {
    const blob = new Blob([payloadJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hearthshift_feedback_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const issueTitle = encodeURIComponent(`[v0.1.0-alpha Feedback] ${category}`);
  const issueBody = encodeURIComponent(
    `Scrubbed alpha feedback summary (0 private household records attached):\n\n\`\`\`json\n${payloadJson}\n\`\`\``
  );
  const githubIssueUrl = `https://github.com/Dinesh0401/HearthShift-AI/issues/new?title=${issueTitle}&body=${issueBody}`;
  const mailtoUrl = `mailto:?subject=${issueTitle}&body=${encodeURIComponent(payloadJson)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-base font-bold text-gray-900">
                {t('feedbackModalTitle')}
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">v0.1.0-alpha · Opt-In Draft Builder</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalBtn')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strict Zero-Telemetry Privacy Notice */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{t('feedbackPrivacyBanner')}</p>
        </div>

        {/* Category & Optional Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="feedback-category" className="block text-xs font-semibold text-gray-700 mb-1">
              {t('feedbackCategoryLabel')}
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="usability">Usability &amp; Interface</option>
              <option value="tariff_bug">Tariff / Calculation Discrepancy</option>
              <option value="region_request">New Tariff / Region Request</option>
              <option value="research_mv">Research / M&amp;V Inquiry</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-700 mb-1">Clarity Rating (Optional)</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Experience rating">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  aria-pressed={rating === val}
                  onClick={() => setRating(rating === val ? null : val)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${
                    rating === val
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sanitized Comments */}
        <div>
          <label htmlFor="feedback-notes" className="block text-xs font-semibold text-gray-700 mb-1">
            Comments (Do not paste account numbers or personal info)
          </label>
          <textarea
            id="feedback-notes"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('feedbackNotesPlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Live Payload Inspection */}
        <div>
          <p className="text-[11px] font-semibold text-gray-700 mb-1">{t('feedbackPreviewLabel')}</p>
          <pre
            data-testid="feedback-payload-preview"
            className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-40"
          >
            {payloadJson}
          </pre>
        </div>

        {/* Explicit Consent Gate for External Draft Links */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={externalConsent}
            onChange={(e) => setExternalConsent(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="leading-relaxed">{t('feedbackConsentLabel')}</span>
        </label>

        {/* Local & Consent-Gated External Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('feedbackCopiedMsg') : t('feedbackCopyBtn')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('feedbackDownloadBtn')}</span>
          </button>

          {externalConsent && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{t('feedbackMailtoBtn')}</span>
              </a>

              <a
                href={githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold transition-colors"
              >
                <span>{t('feedbackGithubBtn')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-500 border-t border-gray-100 pt-2.5 leading-relaxed">
          {t('feedbackExternalLabel')}
        </p>
      </div>
    </div>
  );
};
