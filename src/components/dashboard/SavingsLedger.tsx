'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import type { SavingsRecord, SavingsBasis } from '../../types/contracts';
import { useLanguage } from '../../locales/i18n';
import { Award, CheckCircle2, TrendingUp, Calendar, Trash2, Info } from 'lucide-react';

interface SavingsLedgerProps {
  refreshTrigger?: number;
}

export const SavingsLedger: React.FC<SavingsLedgerProps> = ({ refreshTrigger = 0 }) => {
  const { t } = useLanguage();
  const [records, setRecords] = useState<SavingsRecord[]>([]);

  const loadRecords = useCallback(async () => {
    try {
      await db.initialize();
      const allSavings = await db.savings.reverse().toArray();
      setRecords(allSavings);
    } catch (err) {
      console.error('Failed to load savings ledger', err);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      await db.initialize();
      await db.savings.delete(id);
      await loadRecords();
    } catch (err) {
      console.error('Failed to delete savings record', err);
    }
  };

  // Strictly distinguish between formally verified savings (counterfactual-adjusted) and estimated/user-reported
  const verifiedRecords = records.filter((r) => r.basis === 'measurement_verified' && r.verified);
  const totalVerifiedSavingsInr = verifiedRecords.reduce(
    (sum, r) => sum + (r.verified_actual_savings ?? 0),
    0
  );

  const totalTrackedImpactInr = records.reduce(
    (sum, r) => sum + (r.verified_actual_savings ?? r.estimated_savings),
    0
  );

  const renderProvenanceBadge = (basis: SavingsBasis, verified: boolean) => {
    if (basis === 'measurement_verified' && verified) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-300">
          🟢 {t('verifiedSavingsBreakdown')}
        </span>
      );
    }
    if (basis === 'meter_observed') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
          🟣 {t('meterObservedBreakdown')}
        </span>
      );
    }
    if (basis === 'user_reported') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          🔵 {t('provenanceUserReported')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        🟡 {t('provenanceSimulated')}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-lg text-white">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('savingsLedgerTitle')}</h2>
            <p className="text-xs text-gray-600 mt-0.5">{t('savingsLedgerSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">{t('trackedSavingsImpact')}</p>
              <p className="text-2xl font-bold font-mono text-emerald-700">
                ₹{totalTrackedImpactInr.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Estimated, user-reported &amp; unadjusted</p>
            </div>
          </div>

          <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center gap-4">
            <div className="p-3 bg-teal-600 text-white rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-900">{t('totalVerifiedSavings')}</p>
              <p className="text-2xl font-bold font-mono text-teal-700">
                ₹{totalVerifiedSavingsInr.toFixed(2)}
              </p>
              <p className="text-[10px] text-teal-700 mt-0.5">{t('mvRequiredNote')}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-900">{t('totalCompletedActions')}</p>
              <p className="text-2xl font-bold font-mono text-blue-700">
                {records.length}
              </p>
              <p className="text-[10px] text-blue-700 mt-0.5">Actions logged</p>
            </div>
          </div>
        </div>

        {/* Scientific M&V Disclaimer Box */}
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">{t('counterfactualNoticeTitle')}</p>
            <p className="text-amber-800 leading-relaxed">{t('counterfactualNotice')}</p>
          </div>
        </div>

        {/* Ledger Table */}
        {records.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('noSavingsYet')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('recordDate')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('recordAction')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('recordSavings')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('recordBasis')}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                      {r.period_start}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.notes ?? 'Efficiency Action'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ₹{(r.verified_actual_savings ?? r.estimated_savings).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderProvenanceBadge(r.basis, r.verified)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        title={t('deleteBtn')}
                        aria-label={`Delete savings entry ${r.notes ?? r.id}`}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
