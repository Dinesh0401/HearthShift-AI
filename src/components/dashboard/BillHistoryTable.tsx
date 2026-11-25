'use client';

import React, { useState, useEffect } from 'react';
import { db, type StoredBillEntry } from '../../lib/db';
import { calculateBill } from '../../core/tariff/calculator';
import {
  getTariffPlanById,
  resolveTnpdclTariffForPeriod,
} from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { useLanguage } from '../../locales/i18n';
import { Trash2, Receipt, AlertCircle, AlertTriangle } from 'lucide-react';

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
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-5 h-5 text-emerald-600" />
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {t('historyTitle')}
        </h3>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400">Loading bills from IndexedDB...</div>
      ) : bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-10 px-4 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {t('noBillsYet')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">{t('colPeriod')}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t('colUnits')}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t('colGross')}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t('colSubsidy')}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t('colDuty')}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{t('colNet')}</th>
                <th className="py-2.5 px-3 font-semibold text-center">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {renderedBills.map(({ bill, tariff, breakdown, crossesMay10Boundary }) => (
                  <tr key={bill.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                      {bill.billing_period_start} → {bill.billing_period_end}
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                        {tariff.id}
                        {bill.bill_reference_no ? ` · Ref: ${bill.bill_reference_no}` : ''}
                      </span>
                      {crossesMay10Boundary && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {t('boundaryCrossedBadge')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {bill.total_units_kwh} kWh
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                      ₹{(breakdown.gross_energy_charges_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      -₹{(breakdown.total_subsidy_deductions_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                      ₹{(breakdown.electricity_duty_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                      ₹{(breakdown.net_payable_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(bill.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
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
            <p className="mt-3 rounded-lg bg-amber-50/80 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
              {t('boundaryCrossedNote')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
