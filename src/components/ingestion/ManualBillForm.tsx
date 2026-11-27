'use client';

import React, { useState, useEffect } from 'react';
import {
  validateManualBill,
  saveManualBill,
  type ManualBillInput,
} from '../../core/ingestion/manual-bill';
import {
  SUPPORTED_TARIFF_CATALOG,
  TNPDCL_LT1A_2026_MAY10,
} from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { useLanguage } from '../../locales/i18n';
import { Card } from '../ui/Card';
import { Check, AlertTriangle } from 'lucide-react';

interface ManualBillFormProps {
  activeTariffId?: string;
  onSuccess?: (id: number) => void;
  className?: string;
}

const inputBaseClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors';

export const ManualBillForm: React.FC<ManualBillFormProps> = ({
  activeTariffId,
  onSuccess,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const [hasEditedTariff, setHasEditedTariff] = useState(false);

  const [formData, setFormData] = useState<ManualBillInput>({
    billing_period_start: '',
    billing_period_end: '',
    total_units_kwh: 0,
    total_amount: undefined,
    currency: 'INR',
    tariff_id: activeTariffId ?? TNPDCL_LT1A_2026_MAY10.id,
    bill_reference_no: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeTariffId && !hasEditedTariff) {
      setFormData((prev) =>
        prev.tariff_id === activeTariffId ? prev : { ...prev, tariff_id: activeTariffId }
      );
    }
  }, [activeTariffId, hasEditedTariff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'tariff_id') {
      setHasEditedTariff(true);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleValidatePreview = () => {
    const result = validateManualBill(formData);
    setErrors(result.errors);
    setWarnings(result.warnings);
    setCalculatedAmount(result.calculated_amount);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    const result = handleValidatePreview();
    if (!result.is_valid || !result.bill_entry) {
      return;
    }

    try {
      setIsSubmitting(true);
      const newId = await saveManualBill(result.bill_entry);
      setSuccessMessage(t('billSavedSuccess'));
      if (onSuccess) {
        onSuccess(newId);
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to save bill locally.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h3 className="text-base font-semibold text-zinc-900">{t('addBillTitle')}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{t('addBillSubtitle')}</p>
        </div>

        {successMessage && (
          <div
            role="status"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errors.form && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errors.form}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="billing_period_start"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              {t('periodStart')} *
            </label>
            <input
              id="billing_period_start"
              name="billing_period_start"
              type="date"
              value={formData.billing_period_start}
              onChange={handleInputChange}
              aria-invalid={Boolean(errors.billing_period_start)}
              aria-describedby={errors.billing_period_start ? 'billing_period_start_error' : undefined}
              className={inputBaseClass}
              required
            />
            {errors.billing_period_start && (
              <p id="billing_period_start_error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.billing_period_start}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="billing_period_end"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              {t('periodEnd')} *
            </label>
            <input
              id="billing_period_end"
              name="billing_period_end"
              type="date"
              value={formData.billing_period_end}
              onChange={handleInputChange}
              aria-invalid={Boolean(errors.billing_period_end)}
              aria-describedby={errors.billing_period_end ? 'billing_period_end_error' : undefined}
              className={inputBaseClass}
              required
            />
            {errors.billing_period_end && (
              <p id="billing_period_end_error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.billing_period_end}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="total_units_kwh"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              {t('unitsBilled')} *
            </label>
            <input
              id="total_units_kwh"
              name="total_units_kwh"
              type="number"
              min="0"
              step="0.1"
              value={formData.total_units_kwh || ''}
              onChange={handleInputChange}
              placeholder="450"
              aria-invalid={Boolean(errors.total_units_kwh)}
              aria-describedby={errors.total_units_kwh ? 'total_units_kwh_error' : undefined}
              className={`${inputBaseClass} tabular-nums`}
              required
            />
            {errors.total_units_kwh && (
              <p id="total_units_kwh_error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.total_units_kwh}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tariff_id" className="block text-xs font-medium text-zinc-700 mb-1">
              {t('tariffSelection')} *
            </label>
            <select
              id="tariff_id"
              name="tariff_id"
              value={formData.tariff_id}
              onChange={handleInputChange}
              aria-invalid={Boolean(errors.tariff_id)}
              aria-describedby={errors.tariff_id ? 'tariff_id_error' : undefined}
              className={inputBaseClass}
            >
              {SUPPORTED_TARIFF_CATALOG.map((entry) => (
                <option key={entry.plan.id} value={entry.plan.id}>
                  {entry.regionLabel[language] ?? entry.regionLabel.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="total_amount" className="block text-xs font-medium text-zinc-700 mb-1">
              {t('amountBilled')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-zinc-400">₹</span>
              <input
                id="total_amount"
                name="total_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.total_amount ?? ''}
                onChange={handleInputChange}
                placeholder="1725.00"
                aria-invalid={Boolean(errors.total_amount)}
                aria-describedby={errors.total_amount ? 'total_amount_error' : undefined}
                className={`${inputBaseClass} pl-7 tabular-nums`}
              />
            </div>
            {errors.total_amount && (
              <p id="total_amount_error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.total_amount}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bill_reference_no"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              {t('billReferenceLabel')}
            </label>
            <input
              id="bill_reference_no"
              name="bill_reference_no"
              type="text"
              value={formData.bill_reference_no}
              onChange={handleInputChange}
              placeholder={t('billReferencePlaceholder')}
              className={inputBaseClass}
            />
          </div>
        </div>

        {calculatedAmount !== undefined && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-zinc-900">
              <span>{t('overviewModelEstimate')}</span>
              <span className="font-semibold tabular-nums">₹{calculatedAmount.toFixed(2)}</span>
            </div>
            {warnings.map((w, idx) => (
              <p key={idx} className="text-amber-700 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleValidatePreview}
            className="px-4 py-2 min-h-[40px] text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors"
          >
            {t('verifyBillBtn')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {isSubmitting ? t('savingBillBtn') : t('saveBillBtn')}
          </button>
        </div>
      </form>
    </Card>
  );
};
