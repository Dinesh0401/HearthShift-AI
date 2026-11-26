'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import type { SavingsRecord, SavingsBasis } from '../../types/contracts';
import { useLanguage } from '../../locales/i18n';
import { Card, MetricCard, SectionHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExpandableDetails } from '../ui/Disclosure';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Calendar, Trash2, Info } from 'lucide-react';

interface SavingsLedgerProps {
  refreshTrigger?: number;
}

export const SavingsLedger: React.FC<SavingsLedgerProps> = ({ refreshTrigger = 0 }) => {
  const { t } = useLanguage();
  const [records, setRecords] = useState<SavingsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      await db.initialize();
      const allSavings = await db.savings.reverse().toArray();
      setRecords(allSavings);
    } catch (err) {
      console.error('Failed to load savings ledger', err);
    } finally {
      setLoading(false);
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
        <Badge variant="emerald" dot>
          {t('verifiedSavingsBreakdown')}
        </Badge>
      );
    }
    if (basis === 'meter_observed') {
      return (
        <Badge variant="purple" dot>
          {t('meterObservedBreakdown')}
        </Badge>
      );
    }
    if (basis === 'user_reported') {
      return (
        <Badge variant="blue" dot>
          {t('provenanceUserReported')}
        </Badge>
      );
    }
    return (
      <Badge variant="amber" dot>
        {t('provenanceSimulated')}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader title={t('savingsLedgerTitle')} subtitle={t('savingsLedgerSubtitle')} />

      {/* Understated 3-Column Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label={t('trackedSavingsImpact')}
          value={`₹${totalTrackedImpactInr.toFixed(2)}`}
          accent="emerald"
          helper={t('breakdownEstimatedSubtitle')}
        />
        <MetricCard
          label={t('totalVerifiedSavings')}
          value={`₹${totalVerifiedSavingsInr.toFixed(2)}`}
          helper={t('mvRequiredNote')}
        />
        <MetricCard
          label={t('totalCompletedActions')}
          value={String(records.length)}
          helper={t('savingsLedgerTitle')}
        />
      </div>

      {/* Honest M&V Scope Note (Concise upfront, full rationale expandable) */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-2.5 text-xs text-zinc-700">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">{t('counterfactualNoticeTitle')}</p>
            <ExpandableDetails summary={t('viewDetails')} className="mt-1.5">
              <p className="text-xs text-zinc-600 leading-relaxed">{t('counterfactualNotice')}</p>
            </ExpandableDetails>
          </div>
        </div>
      </Card>

      {/* Ledger Table / Empty State */}
      {loading ? (
        <Card className="p-5 space-y-2.5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </Card>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-5 h-5" />}
          title={t('savingsLedgerTitle')}
          description={t('noSavingsYet')}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t('recordDate')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('recordAction')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('recordSavings')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('recordBasis')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-zinc-500 whitespace-nowrap tabular-nums">
                      {r.period_start}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900">
                      {r.notes ?? 'Efficiency Action'}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-700 whitespace-nowrap tabular-nums">
                      ₹{(r.verified_actual_savings ?? r.estimated_savings).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderProvenanceBadge(r.basis, r.verified)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        title={t('deleteBtn')}
                        aria-label={`Delete savings entry ${r.notes ?? r.id}`}
                        className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
