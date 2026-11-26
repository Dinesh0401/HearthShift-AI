'use client';

import React, { useState, useEffect } from 'react';
import { db, type StoredBillEntry } from '../../lib/db';
import { calculateBill } from '../../core/tariff/calculator';
import {
  getTariffPlanById,
  resolveTnpdclTariffForPeriod,
} from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { useLanguage } from '../../locales/i18n';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Trash2, Receipt, AlertTriangle } from 'lucide-react';

interface BillHistoryTableProps {
  refreshTrigger?: number;
  onBillDeleted?: () => void;
  className?: string;
}

export const BillHistoryTable: React.FC<BillHistoryTableProps> = ({
  refreshTrigger = 0,
  onBillDeleted,
  className = '',
}) => {
  const { t } = useLanguage();
  const [bills, setBills] = useState<StoredBillEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBills = async () => {
    try {
      setLoading(true);
      const allBills = await db.bills.orderBy('billing_period_start').reverse().toArray();
      setBills(allBills);
    } catch (err) {
      console.error('Failed to load bills from IndexedDB', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [refreshTrigger]);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      await db.bills.delete(id);
      await loadBills();
      if (onBillDeleted) {
        onBillDeleted();
      }
    } catch (err) {
      console.error('Failed to delete bill', err);
    }
  };

  const renderedBills = bills.map((bill) => {
    const resolvedPeriod = resolveTnpdclTariffForPeriod(
      bill.billing_period_end,
      bill.billing_period_start
    );
    const tariff = bill.tariff_id
      ? getTariffPlanById(bill.tariff_id)
      : resolvedPeriod.plan;
    const breakdown = calculateBill(bill.total_units_kwh, tariff);
    const isTnpdclTransitionEligiblePlan =
      tariff.id === 'in-tnpdcl-lt1a-may2026' || tariff.id === 'in-tnpdcl-lt1a-2025';
    const crossesMay10Boundary =
      isTnpdclTransitionEligiblePlan && resolvedPeriod.isTransitionBoundaryStraddled;

    return {
      bill,
      tariff,
      breakdown,
      crossesMay10Boundary,
    };
  });

  const hasBoundaryCrossingBill = renderedBills.some((item) => item.crossesMay10Boundary);

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <h3 className="text-base font-semibold text-zinc-900">{t('historyTitle')}</h3>
        </div>
        {bills.length > 0 && <Badge variant="neutral">{bills.length}</Badge>}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-10 px-4 text-center">
          <Receipt className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            {t('noBillsYet')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="py-2.5 pr-3 font-medium">{t('colPeriod')}</th>
                <th className="py-2.5 px-3 font-medium text-right">{t('colUnits')}</th>
                <th className="py-2.5 px-3 font-medium text-right hidden sm:table-cell">
                  {t('colGross')}
                </th>
                <th className="py-2.5 px-3 font-medium text-right hidden sm:table-cell">
                  {t('colSubsidy')}
                </th>
                <th className="py-2.5 px-3 font-medium text-right hidden md:table-cell">
                  {t('colDuty')}
                </th>
                <th className="py-2.5 px-3 font-medium text-right">{t('colNet')}</th>
                <th className="py-2.5 pl-3 font-medium text-center">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {renderedBills.map(({ bill, tariff, breakdown, crossesMay10Boundary }) => (
                <tr key={bill.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 pr-3 font-medium text-zinc-900">
                    {bill.billing_period_start} → {bill.billing_period_end}
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">
                      {tariff.id}
                      {bill.bill_reference_no ? ` · Ref: ${bill.bill_reference_no}` : ''}
                    </span>
                    {crossesMay10Boundary && (
                      <Badge variant="amber" className="mt-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{t('boundaryCrossedBadge')}</span>
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-zinc-800 tabular-nums whitespace-nowrap">
                    {bill.total_units_kwh} kWh
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-500 tabular-nums whitespace-nowrap hidden sm:table-cell">
                    ₹{(breakdown.gross_energy_charges_paise / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-medium tabular-nums whitespace-nowrap hidden sm:table-cell">
                    -₹{(breakdown.total_subsidy_deductions_paise / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-500 tabular-nums whitespace-nowrap hidden md:table-cell">
                    ₹{(breakdown.electricity_duty_paise / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-zinc-900 tabular-nums whitespace-nowrap">
                    ₹{(breakdown.net_payable_paise / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pl-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(bill.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-zinc-100"
                      title={t('deleteBtn')}
                      aria-label={`Delete bill for ${bill.billing_period_start}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasBoundaryCrossingBill && (
            <p className="mt-3 rounded-xl bg-amber-50/70 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 leading-relaxed">
              {t('boundaryCrossedNote')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
