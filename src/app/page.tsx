'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, type StoredBillEntry } from '../lib/db';
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
import { HomeOverview } from '../components/dashboard/HomeOverview';
import { TariffHeadroomCard } from '../components/dashboard/TariffHeadroomCard';
import { CapabilityBadge } from '../components/ingestion/CapabilityBadge';
import { ManualBillForm } from '../components/ingestion/ManualBillForm';
import { BillHistoryTable } from '../components/dashboard/BillHistoryTable';
import { CsvDropzone } from '../components/ingestion/CsvDropzone';
import { IntervalChart } from '../components/dashboard/IntervalChart';
import { ScenarioSimulator } from '../components/dashboard/ScenarioSimulator';
import { RecommendationFeed } from '../components/dashboard/RecommendationFeed';
import { SavingsLedger } from '../components/dashboard/SavingsLedger';
import { PrivacyDataManager } from '../components/dashboard/PrivacyDataManager';
import { ChangelogModal, AlphaFeedbackModal } from '../components/alpha/AlphaModals';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ExpandableDetails } from '../components/ui/Disclosure';
import { useLanguage } from '../locales/i18n';
import {
  Home,
  Receipt,
  FileSpreadsheet,
  Activity,
  SlidersHorizontal,
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

type ActiveTab =
  | 'overview'
  | 'bills'
  | 'import'
  | 'intervals'
  | 'simulator'
  | 'recommendations'
  | 'savings'
  | 'privacy';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestUnits, setLatestUnits] = useState(380);
  const [latestBill, setLatestBill] = useState<StoredBillEntry | null>(null);
  const [billsCount, setBillsCount] = useState(0);
  const [readingsCount, setReadingsCount] = useState(0);
  const [readingsSpanDays, setReadingsSpanDays] = useState(0);
  const [evaluation, setEvaluation] = useState<CapabilityEvaluation | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [activeTariffId, setActiveTariffId] = useState<string>(TNPDCL_LT1A_2026_MAY10.id);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isDemoBusy, setIsDemoBusy] = useState<boolean>(false);
  const [showChangelog, setShowChangelog] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

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

      const newestBill = (await db.bills.orderBy('billing_period_start').reverse().first()) ?? null;
      setBillsCount(bCount);
      setReadingsCount(rCount);
      setReadingsSpanDays(spanDays);
      setLatestBill(newestBill);
      setLatestUnits(newestBill ? newestBill.total_units_kwh : 380);

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
    } finally {
      setIsLoadingState(false);
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
    { id: 'overview', label: t('tabOverview'), icon: <Home className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'bills', label: t('tabBills'), icon: <Receipt className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'import', label: t('tabImport'), icon: <FileSpreadsheet className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'intervals', label: t('tabIntervals'), icon: <Activity className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'simulator', label: t('tabSimulator'), icon: <SlidersHorizontal className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'recommendations', label: t('tabRecommendations'), icon: <Lightbulb className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'savings', label: t('tabSavings'), icon: <Award className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
    { id: 'privacy', label: t('tabPrivacy'), icon: <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.75} /> },
  ];

  const verificationLabel =
    activeCatalogEntry.verificationStatus === 'statutory_consumer_payable'
      ? 'Statutory'
      : activeCatalogEntry.verificationStatus === 'historical_baseline'
      ? 'Historical'
      : 'Reference';

  return (
    <div className="space-y-5">
      {/* Compact Sample Household Banner (Only shown when Sample Mode active) */}
      {isDemoMode && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-xs text-amber-900 min-w-0">
              <strong className="font-semibold text-amber-950">{t('demoModeBannerTitle')}</strong>
              <span className="hidden md:inline text-amber-800"> — {t('demoModeBannerDesc')}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearDemo}
            disabled={isDemoBusy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-amber-900 hover:bg-amber-950 text-white text-xs font-medium shrink-0 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearDemoBtn')}</span>
          </button>
        </div>
      )}

      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      <AlphaFeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        activeTariffId={activeTariff.id}
      />

      {/* Unified SaaS Shell: Desktop Sidebar + Main Canvas / Mobile Scrollable Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        {/* Navigation Sidebar (Desktop) / Horizontal Scroll Tabs (Mobile & Tablet) */}
        <aside className="min-w-0 lg:sticky lg:top-24 space-y-4">
          <nav aria-label="Dashboard sections" className="min-w-0 w-full">
            <div
              role="tablist"
              aria-label="Dashboard sections"
              className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0"
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
                    className={`flex items-center gap-2.5 min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 lg:w-full text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/70'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 border border-transparent font-medium'
                    }`}
                  >
                    <span className={isSelected ? 'text-emerald-600' : 'text-zinc-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Desktop Quick Info Card inside Sidebar */}
          {evaluation && (
            <div className="hidden lg:block pt-2 border-t border-zinc-200/80">
              <CapabilityBadge
                mode={evaluation.mode}
                reasons={evaluation.reasons}
                nextStepGuidance={evaluation.next_step_guidance}
              />
            </div>
          )}
        </aside>

        {/* Main Workspace Column */}
        <div className="min-w-0 space-y-5">
          {/* Compact Context Toolbar: Tariff Region + Sample + Utility Modals */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200/80">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <label htmlFor="region-tariff-selector" className="sr-only">
                {t('selectTariffRegion')}
              </label>
              <select
                id="region-tariff-selector"
                aria-label={t('selectTariffRegion')}
                value={activeTariffId}
                onChange={handleTariffChange}
                className="min-h-[38px] w-full min-w-0 sm:w-auto sm:max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                {SUPPORTED_TARIFF_CATALOG.map((entry) => (
                  <option key={entry.plan.id} value={entry.plan.id}>
                    {entry.regionLabel[language] ?? entry.regionLabel.en}
                  </option>
                ))}
              </select>
              <Badge variant="neutral" className="hidden sm:inline-flex">
                {verificationLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
              {!isDemoMode && (
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  disabled={isDemoBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isDemoBusy ? 'Loading...' : t('loadDemoBtn')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowChangelog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{t('openChangelogBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{t('openFeedbackBtn')}</span>
              </button>
            </div>
          </div>

          {/* Active Tab Content */}
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'overview' && (
              <HomeOverview
                tariff={activeTariff}
                evaluation={evaluation}
                latestBill={latestBill}
                billsCount={billsCount}
                readingsCount={readingsCount}
                readingsSpanDays={readingsSpanDays}
                isDemoMode={isDemoMode}
                isLoading={isLoadingState}
                isDemoBusy={isDemoBusy}
                onLoadDemo={handleLoadDemo}
                onNavigate={setActiveTab}
                onActionLogged={handleStateUpdated}
              />
            )}

            {activeTab === 'bills' && (
              <div className="space-y-5">
                <TariffHeadroomCard latestUnitsKwh={latestUnits} tariff={activeTariff} />
                <ManualBillForm
                  activeTariffId={activeTariff.id}
                  onSuccess={handleStateUpdated}
                />
                <BillHistoryTable
                  refreshTrigger={refreshTrigger}
                  onBillDeleted={handleStateUpdated}
                />
              </div>
            )}

            {activeTab === 'import' && (
              <CsvDropzone
                onImportComplete={() => {
                  handleStateUpdated();
                  setActiveTab('intervals');
                }}
              />
            )}

            {activeTab === 'intervals' && (
              <IntervalChart
                canVisualizeIntervals={evaluation?.permissions.can_visualize_intervals ?? false}
                refreshTrigger={refreshTrigger}
                onGoToImport={() => setActiveTab('import')}
              />
            )}

            {activeTab === 'simulator' && (
              <ScenarioSimulator baselineUnitsKwh={latestUnits} tariff={activeTariff} />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationFeed
                latestUnitsKwh={latestUnits}
                tariff={activeTariff}
                onActionLogged={handleStateUpdated}
              />
            )}

            {activeTab === 'savings' && <SavingsLedger refreshTrigger={refreshTrigger} />}

            {activeTab === 'privacy' && <PrivacyDataManager onDataPurged={handleStateUpdated} />}
          </div>

          {/* Progressive Reference Footer inside Workspace (Always accessible, never blocks fold) */}
          <Card className="p-4 sm:p-5 bg-zinc-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ExpandableDetails
                summary={t('alphaDisclaimerTitle')}
                icon={<Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
              >
                <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
                  <p>{t('alphaDisclaimerDesc')}</p>
                  <p>{t('supportedRegionsNote')}</p>
                  <p className="font-medium text-zinc-800">{t('tariffVerificationNote')}</p>
                  <p className="text-[11px] text-zinc-500">
                    {activeCatalogEntry.regulatoryNote[language] ??
                      activeCatalogEntry.regulatoryNote.en}
                  </p>
                </div>
              </ExpandableDetails>

              <ExpandableDetails
                summary={t('howItWorksTitle')}
                icon={<BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              >
                <ul className="space-y-1.5 text-xs text-zinc-600 leading-relaxed">
                  <li>{t('howItWorksStep1')}</li>
                  <li>{t('howItWorksStep2')}</li>
                  <li>{t('howItWorksStep3')}</li>
                  <li className="text-amber-800 font-medium pt-0.5">{t('howItWorksBoundaries')}</li>
                </ul>
              </ExpandableDetails>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
