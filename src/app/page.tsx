'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/db';
import { evaluateCapabilityState, type CapabilityEvaluation } from '../core/capabilities/policy';
import {
  SUPPORTED_TARIFF_CATALOG,
  getTariffPlanById,
  TNPDCL_LT1A_2026_MAY10,
} from '../core/tariff/tariffs/tnpdcl-lt1a';
import {
  ACTIVE_TARIFF_STORAGE_KEY,
  DEMO_TARIFF_ID,
  isSyntheticDemoMode,
  loadSyntheticDemoHousehold,
  clearDemoDataset,
} from '../core/demo/synthetic-household';
import { CapabilityBadge } from '../components/ingestion/CapabilityBadge';
import { TariffHeadroomCard } from '../components/dashboard/TariffHeadroomCard';
import { ManualBillForm } from '../components/ingestion/ManualBillForm';
import { BillHistoryTable } from '../components/dashboard/BillHistoryTable';
import { CsvDropzone } from '../components/ingestion/CsvDropzone';
import { IntervalChart } from '../components/dashboard/IntervalChart';
import { ScenarioSimulator } from '../components/dashboard/ScenarioSimulator';
import { RecommendationFeed } from '../components/dashboard/RecommendationFeed';
import { SavingsLedger } from '../components/dashboard/SavingsLedger';
import { PrivacyDataManager } from '../components/dashboard/PrivacyDataManager';
import { ChangelogModal, AlphaFeedbackModal } from '../components/alpha/AlphaModals';
import { useLanguage } from '../locales/i18n';
import {
  Receipt,
  FileSpreadsheet,
  Activity,
  Sliders,
  Lightbulb,
  Award,
  ShieldCheck,
  MapPin,
  FlaskConical,
  AlertTriangle,
  Info,
  Trash2,
  BookOpen,
  FileText,
  MessageSquarePlus,
} from 'lucide-react';

type ActiveTab = 'bills' | 'import' | 'intervals' | 'simulator' | 'recommendations' | 'savings' | 'privacy';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestUnits, setLatestUnits] = useState(380);
  const [evaluation, setEvaluation] = useState<CapabilityEvaluation | null>(null);
  const [activeTariffId, setActiveTariffId] = useState<string>(TNPDCL_LT1A_2026_MAY10.id);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isDemoBusy, setIsDemoBusy] = useState<boolean>(false);
  const [showChangelog, setShowChangelog] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // Sync persisted region tariff & demo flag after mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTariffId = window.localStorage.getItem(ACTIVE_TARIFF_STORAGE_KEY);
      if (savedTariffId) {
        setActiveTariffId(getTariffPlanById(savedTariffId).id);
      }
      setIsDemoMode(isSyntheticDemoMode());
    }
  }, []);

  const activeTariff = useMemo(() => getTariffPlanById(activeTariffId), [activeTariffId]);
  const activeCatalogEntry = useMemo(
    () =>
      SUPPORTED_TARIFF_CATALOG.find((entry) => entry.plan.id === activeTariff.id) ??
      SUPPORTED_TARIFF_CATALOG[0],
    [activeTariff]
  );

  const refreshState = useCallback(async () => {
    try {
      await db.initialize();
      const bCount = await db.bills.count();
      const rCount = await db.readings.count();

      let spanDays = 0;
      if (rCount > 0) {
        const first = await db.readings.orderBy('timestamp').first();
        const last = await db.readings.orderBy('timestamp').reverse().first();
        if (first && last) {
          const diffMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
          spanDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24));
        }
      }

      const latestBill = await db.bills.orderBy('billing_period_start').reverse().first();
      if (latestBill) {
        setLatestUnits(latestBill.total_units_kwh);
      } else {
        setLatestUnits(380);
      }

      const pref = await db.preferences.get('default_household');
      const constraints =
        pref?.comfort_constraints && pref.comfort_constraints.length > 0
          ? pref.comfort_constraints
          : rCount >= 168
          ? [
              {
                id: 'default_c',
                type: 'temperature_bound' as const,
                description: 'Default AC comfort bounds',
                flexibility: 'medium' as const,
                confidence: 1.0,
              },
            ]
          : [];

      const evalResult = evaluateCapabilityState({
        bills_count: bCount,
        readings_count: rCount,
        readings_span_days: spanDays,
        comfort_constraints: constraints,
        active_tariff: activeTariff,
      });

      setEvaluation(evalResult);
      setIsDemoMode(isSyntheticDemoMode());
    } catch (err) {
      console.error('Failed to load dashboard state from IndexedDB', err);
    }
  }, [activeTariff]);

  useEffect(() => {
    refreshState();
  }, [refreshState, refreshTrigger]);

  const handleStateUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTariffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = getTariffPlanById(e.target.value).id;
    setActiveTariffId(nextId);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_TARIFF_STORAGE_KEY, nextId);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setIsDemoBusy(true);
      await loadSyntheticDemoHousehold();
      setActiveTariffId(DEMO_TARIFF_ID);
      setIsDemoMode(true);
      handleStateUpdated();
    } catch (err) {
      console.error('Failed to load synthetic demo household', err);
    } finally {
      setIsDemoBusy(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      setIsDemoBusy(true);
      await clearDemoDataset();
      setIsDemoMode(false);
      handleStateUpdated();
    } catch (err) {
      console.error('Failed to clear demo dataset', err);
    } finally {
      setIsDemoBusy(false);
    }
  };

  const tabItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'bills', label: t('tabBills'), icon: <Receipt className="w-4 h-4 shrink-0" /> },
    { id: 'import', label: t('tabImport'), icon: <FileSpreadsheet className="w-4 h-4 shrink-0" /> },
    { id: 'intervals', label: t('tabIntervals'), icon: <Activity className="w-4 h-4 shrink-0" /> },
    { id: 'simulator', label: t('tabSimulator'), icon: <Sliders className="w-4 h-4 shrink-0" /> },
    { id: 'recommendations', label: t('tabRecommendations'), icon: <Lightbulb className="w-4 h-4 shrink-0" /> },
    { id: 'savings', label: t('tabSavings'), icon: <Award className="w-4 h-4 shrink-0" /> },
    { id: 'privacy', label: t('tabPrivacy'), icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Persistent Synthetic Demo Mode Banner */}
      {isDemoMode && (
        <div
          role="status"
          className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-amber-950">
                {t('demoModeBannerTitle')}
              </p>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                {t('demoModeBannerDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearDemo}
            disabled={isDemoBusy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shrink-0 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('clearDemoBtn')}
          </button>
        </div>
      )}

      {/* Control Strip: Region Tariff Selector & Safe Demo Mode Trigger */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Supported Tariff Region Selector */}
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="region-tariff-selector"
              className="flex items-center gap-1.5 text-xs font-bold text-gray-800"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('selectTariffRegion')}</span>
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <select
                id="region-tariff-selector"
                aria-label={t('selectTariffRegion')}
                value={activeTariffId}
                onChange={handleTariffChange}
                className="w-full sm:max-w-md rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {SUPPORTED_TARIFF_CATALOG.map((entry) => (
                  <option key={entry.plan.id} value={entry.plan.id}>
                    {entry.regionLabel[language] ?? entry.regionLabel.en}
                  </option>
                ))}
              </select>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 w-fit">
                {activeCatalogEntry.verificationStatus === 'statutory_consumer_payable'
                  ? 'Statutory Consumer-Payable'
                  : activeCatalogEntry.verificationStatus === 'historical_baseline'
                  ? 'Historical Baseline'
                  : 'Generic Reference'}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {activeCatalogEntry.regulatoryNote[language] ?? activeCatalogEntry.regulatoryNote.en}
            </p>
          </div>

          {/* Safe Demo Loader Button */}
          {!isDemoMode && (
            <div className="flex flex-col sm:items-end gap-1.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={isDemoBusy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <FlaskConical className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{isDemoBusy ? 'Loading Demo...' : t('loadDemoBtn')}</span>
              </button>
              <span className="text-[11px] text-gray-500">
                Synthetic 3 bills + 192h sample · 0 fake verified savings
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Supported Regions & Alpha Limitations Disclosure */}
        <details className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-800 flex items-center gap-2 select-none">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{t('alphaDisclaimerTitle')}</span>
          </summary>
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] text-slate-600 leading-relaxed">
            <p>{t('alphaDisclaimerDesc')}</p>
            <p>{t('supportedRegionsNote')}</p>
            <p className="font-medium text-slate-700">{t('tariffVerificationNote')}</p>
          </div>
        </details>

        {/* How HearthShift Works + Changelog & Zero-Telemetry Feedback Triggers */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <details className="flex-1 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-2.5 text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold text-emerald-950 flex items-center gap-2 select-none">
              <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{t('howItWorksTitle')}</span>
            </summary>
            <ul className="mt-2.5 pt-2.5 border-t border-emerald-200/60 space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
              <li>{t('howItWorksStep1')}</li>
              <li>{t('howItWorksStep2')}</li>
              <li>{t('howItWorksStep3')}</li>
              <li className="text-amber-900 font-medium pt-0.5">{t('howItWorksBoundaries')}</li>
            </ul>
          </details>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowChangelog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{t('openChangelogBtn')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>{t('openFeedbackBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      <AlphaFeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        activeTariffId={activeTariff.id}
      />

      {/* Top Section: Capability Badge & Tariff Headroom Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col">
          {evaluation && (
            <CapabilityBadge
              mode={evaluation.mode}
              reasons={evaluation.reasons}
              nextStepGuidance={evaluation.next_step_guidance}
              className="h-full"
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <TariffHeadroomCard latestUnitsKwh={latestUnits} tariff={activeTariff} />
        </div>
      </div>

      {/* Main Accessible Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav aria-label="Tabs">
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="flex flex-wrap lg:flex-nowrap gap-1 sm:gap-4 overflow-x-auto pb-1"
          >
            {tabItems.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'bills' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <ManualBillForm activeTariffId={activeTariff.id} onSuccess={handleStateUpdated} />
              </div>
              <div className="lg:col-span-2">
                <BillHistoryTable
                  refreshTrigger={refreshTrigger}
                  onBillDeleted={handleStateUpdated}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <CsvDropzone
              onImportComplete={() => {
                handleStateUpdated();
                setActiveTab('intervals');
              }}
            />
          </div>
        )}

        {activeTab === 'intervals' && (
          <div className="space-y-6">
            <IntervalChart
              canVisualizeIntervals={evaluation?.permissions.can_visualize_intervals ?? false}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <ScenarioSimulator baselineUnitsKwh={latestUnits} tariff={activeTariff} />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <RecommendationFeed
              latestUnitsKwh={latestUnits}
              tariff={activeTariff}
              onActionLogged={handleStateUpdated}
            />
          </div>
        )}

        {activeTab === 'savings' && (
          <div className="space-y-6">
            <SavingsLedger refreshTrigger={refreshTrigger} />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div>
            <PrivacyDataManager onDataPurged={handleStateUpdated} />
          </div>
        )}
      </div>
    </div>
  );
}
