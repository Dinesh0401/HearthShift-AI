'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { evaluateCapabilityState, type CapabilityEvaluation } from '../core/capabilities/policy';
import { TNPDCL_LT1A_2026_MAY10 } from '../core/tariff/tariffs/tnpdcl-lt1a';
import { CapabilityBadge } from '../components/ingestion/CapabilityBadge';
import { TariffHeadroomCard } from '../components/dashboard/TariffHeadroomCard';
import { ManualBillForm } from '../components/ingestion/ManualBillForm';
import { BillHistoryTable } from '../components/dashboard/BillHistoryTable';
import { CsvDropzone } from '../components/ingestion/CsvDropzone';
import { IntervalChart } from '../components/dashboard/IntervalChart';
import { PrivacyDataManager } from '../components/dashboard/PrivacyDataManager';
import { useLanguage } from '../locales/i18n';
import { Receipt, FileSpreadsheet, Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';

type ActiveTab = 'bills' | 'import' | 'intervals' | 'privacy';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [billsCount, setBillsCount] = useState(0);
  const [readingsCount, setReadingsCount] = useState(0);
  const [readingsSpanDays, setReadingsSpanDays] = useState(0);
  const [latestUnits, setLatestUnits] = useState(380);
  const [evaluation, setEvaluation] = useState<CapabilityEvaluation | null>(null);

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
      }

      setBillsCount(bCount);
      setReadingsCount(rCount);
      setReadingsSpanDays(spanDays);

      const evalResult = evaluateCapabilityState({
        bills_count: bCount,
        readings_count: rCount,
        readings_span_days: spanDays,
        active_tariff: TNPDCL_LT1A_2026_MAY10,
      });

      setEvaluation(evalResult);
    } catch (err) {
      console.error('Failed to load dashboard state from IndexedDB', err);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState, refreshTrigger]);

  const handleStateUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Top Section: Capability Badge & Tariff Headroom Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capability Status Banner */}
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

        {/* Deterministic Tariff & 500 kWh Cliff Headroom Card */}
        <div className="lg:col-span-2">
          <TariffHeadroomCard latestUnitsKwh={latestUnits} />
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'bills'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            {t('tabBills')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('tabImport')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intervals')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'intervals'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            {t('tabIntervals')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'privacy'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {t('tabPrivacy')}
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'bills' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <ManualBillForm onSuccess={handleStateUpdated} />
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

        {activeTab === 'privacy' && (
          <div>
            <PrivacyDataManager onDataPurged={handleStateUpdated} />
          </div>
        )}
      </div>
    </div>
  );
}
