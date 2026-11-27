'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Download,
  Check,
  ExternalLink,
  Mail,
  FileText,
  MessageSquarePlus,
  ShieldCheck,
} from 'lucide-react';
import { sanitizePlainTextInput } from '../../core/ingestion/manual-bill';
import { useLanguage } from '../../locales/i18n';
import { Badge } from '../ui/Badge';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[2px] p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="changelog-modal-title" className="text-base font-semibold text-zinc-900">
                {t('changelogTitle')}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">{t('changelogSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalBtn')}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-zinc-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-900">v0.1.0-alpha</span>
              <Badge variant="emerald">2026-11-26</Badge>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-zinc-600">
              <li>Integer-paise TNPDCL LT-1A (May 2026, 2025–2026, 2024–2025) and Flat / TOU schedules.</li>
              <li>TR-VOI comfort-bounded advisor with Python cross-language verification.</li>
              <li>Progressive gating (Bills only / Meter readings active / Ready for recommendations) and bounded 25 MB CSV import.</li>
              <li>Complete atomic export of all 10 IndexedDB tables and all interval readings.</li>
              <li>Clean consumer SaaS interface with bilingual English / Tamil support.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <p className="font-semibold text-amber-950">Explicitly Not Implemented Yet</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-900">
              <li>
                <strong>No Offline Service Worker Caching:</strong> <code>manifest.json</code> provides app metadata only; opening or reloading requires network access to the host.
              </li>
              <li>
                <strong>No IPMVP Option C / ASHRAE 14 Certification:</strong> Modeled and user-reported figures are not calibrated M&amp;V baselines.
              </li>
              <li>
                <strong>No Human Field Study Results Yet:</strong> Pre-pilot research materials are prepared; participant sessions have not started.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[38px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
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
type FeedbackArea =
  | 'overview'
  | 'bills'
  | 'import_usage'
  | 'simulator_recommendations'
  | 'privacy'
  | 'navigation'
  | 'general';

export const AlphaFeedbackModal: React.FC<AlphaFeedbackModalProps> = ({
  isOpen,
  onClose,
  activeTariffId,
}) => {
  const { language, t } = useLanguage();
  const [category, setCategory] = useState<FeedbackCategory>('usability');
  const [usabilityArea, setUsabilityArea] = useState<FeedbackArea | ''>('');
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

  const sanitizedNotes = sanitizePlainTextInput(notes, 1000);
  const scrubbedPayload = {
    schema: 'hearthshift_alpha_feedback_v1',
    version: 'v0.1.0-alpha',
    createdAt: new Date().toISOString().slice(0, 10),
    uiLanguage: language,
    selectedTariffId: activeTariffId,
    category,
    usabilityArea: category === 'usability' ? usabilityArea || null : null,
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
  const canCreateDraft = category !== 'usability' || Boolean(usabilityArea);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[2px] p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-base font-semibold text-zinc-900">
                {t('feedbackModalTitle')}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">v0.1.0-alpha · Opt-in draft builder</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeModalBtn')}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{t('feedbackPrivacyBanner')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="feedback-category" className="block text-xs font-medium text-zinc-700 mb-1">
              {t('feedbackCategoryLabel')}
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            >
              <option value="usability">Usability &amp; Interface</option>
              <option value="tariff_bug">Tariff / Calculation Discrepancy</option>
              <option value="region_request">New Tariff / Region Request</option>
              <option value="research_mv">Research / M&amp;V Inquiry</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-700 mb-1">Clarity rating (optional)</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Experience rating">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  aria-pressed={rating === val}
                  onClick={() => setRating(rating === val ? null : val)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    rating === val
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {category === 'usability' && (
          <div>
            <label htmlFor="feedback-usability-area" className="block text-xs font-medium text-zinc-700 mb-1">
              {t('feedbackUsabilityAreaLabel')}
            </label>
            <select
              id="feedback-usability-area"
              value={usabilityArea}
              onChange={(e) => setUsabilityArea(e.target.value as FeedbackArea | '')}
              aria-required="true"
              aria-describedby={!usabilityArea ? 'feedback-usability-area-hint' : undefined}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            >
              <option value="">{t('feedbackUsabilityAreaPlaceholder')}</option>
              <option value="overview">{t('feedbackAreaOverview')}</option>
              <option value="bills">{t('feedbackAreaBills')}</option>
              <option value="import_usage">{t('feedbackAreaImportUsage')}</option>
              <option value="simulator_recommendations">{t('feedbackAreaSimulatorRecommendations')}</option>
              <option value="privacy">{t('feedbackAreaPrivacy')}</option>
              <option value="navigation">{t('feedbackAreaNavigation')}</option>
              <option value="general">{t('feedbackAreaGeneral')}</option>
            </select>
            {!usabilityArea && (
              <p id="feedback-usability-area-hint" className="mt-1 text-[11px] text-zinc-500">
                {t('feedbackUsabilityAreaRequired')}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="feedback-notes" className="block text-xs font-medium text-zinc-700 mb-1">
            Comments (never include account numbers or personal info)
          </label>
          <textarea
            id="feedback-notes"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('feedbackNotesPlaceholder')}
            className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div>
          <p className="text-[11px] font-medium text-zinc-600 mb-1">{t('feedbackPreviewLabel')}</p>
          <pre
            data-testid="feedback-payload-preview"
            className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-[11px] font-mono overflow-x-auto max-h-40"
          >
            {payloadJson}
          </pre>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={externalConsent}
            onChange={(e) => setExternalConsent(e.target.checked)}
            className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
          />
          <span className="leading-relaxed">{t('feedbackConsentLabel')}</span>
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyDraft}
            disabled={!canCreateDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('feedbackCopiedMsg') : t('feedbackCopyBtn')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDraft}
            disabled={!canCreateDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('feedbackDownloadBtn')}</span>
          </button>

          {externalConsent && canCreateDraft && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{t('feedbackMailtoBtn')}</span>
              </a>

              <a
                href={githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-medium transition-colors"
              >
                <span>{t('feedbackGithubBtn')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        <p className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-2.5 leading-relaxed">
          {t('feedbackExternalLabel')}
        </p>
      </div>
    </div>
  );
};
