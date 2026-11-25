'use client';

import React, { useState, useEffect } from 'react';
import { validateManualBill, saveManualBill, type ManualBillInput } from '../../core/ingestion/manual-bill';
import { SUPPORTED_TARIFF_CATALOG, TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { useLanguage } from '../../locales/i18n';

interface ManualBillFormProps {
  activeTariffId?: string;
  onSuccess?: (id: number) => void;
  className?: string;
}

export const ManualBillForm: React.FC<ManualBillFormProps> = ({
  activeTariffId,
  onSuccess,
  className = '',
}) => {
  const { language } = useLanguage();
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
    // Clear field-specific error on change
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
      setSuccessMessage('Electricity bill successfully saved locally in IndexedDB.');
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
    <form onSubmit={handleSubmit} className={`space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Manual Electricity Bill Entry
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          மின்சார கட்டண உள்ளீடு · Enter historical utility bills. All data is processed and stored on-device only.
        </p>
      </div>

      {successMessage && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm">
          ✓ {successMessage}
        </div>
      )}

      {errors.form && (
        <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-sm">
          ⚠️ {errors.form}
        </div>
      )}

      {/* Date Range Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="billing_period_start" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Billing Period Start (தொடக்க தேதி) *
          </label>
          <input
            id="billing_period_start"
            name="billing_period_start"
            type="date"
            value={formData.billing_period_start}
            onChange={handleInputChange}
            aria-invalid={Boolean(errors.billing_period_start)}
            aria-describedby={errors.billing_period_start ? 'billing_period_start_error' : undefined}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            required
          />
          {errors.billing_period_start && (
            <p id="billing_period_start_error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.billing_period_start}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="billing_period_end" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Billing Period End (முடிவு தேதி) *
          </label>
          <input
            id="billing_period_end"
            name="billing_period_end"
            type="date"
            value={formData.billing_period_end}
            onChange={handleInputChange}
            aria-invalid={Boolean(errors.billing_period_end)}
            aria-describedby={errors.billing_period_end ? 'billing_period_end_error' : undefined}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            required
          />
          {errors.billing_period_end && (
            <p id="billing_period_end_error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.billing_period_end}
            </p>
          )}
        </div>
      </div>

      {/* Consumption & Tariff Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="total_units_kwh" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Electricity Consumption in Units / kWh (பயன்பாடு) *
          </label>
          <input
            id="total_units_kwh"
            name="total_units_kwh"
            type="number"
            min="0"
            step="0.1"
            value={formData.total_units_kwh || ''}
            onChange={handleInputChange}
            placeholder="e.g. 450"
            aria-invalid={Boolean(errors.total_units_kwh)}
            aria-describedby={errors.total_units_kwh ? 'total_units_kwh_error' : undefined}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            required
          />
          {errors.total_units_kwh && (
            <p id="total_units_kwh_error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.total_units_kwh}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tariff_id" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Applicable Tariff Plan (மின் கட்டண திட்டம்) *
          </label>
          <select
            id="tariff_id"
            name="tariff_id"
            value={formData.tariff_id}
            onChange={handleInputChange}
            aria-invalid={Boolean(errors.tariff_id)}
            aria-describedby={errors.tariff_id ? 'tariff_id_error' : undefined}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
          >
            {SUPPORTED_TARIFF_CATALOG.map((entry) => (
              <option key={entry.plan.id} value={entry.plan.id}>
                {entry.regionLabel[language] ?? entry.regionLabel.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Actual Amount & Local Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="total_amount" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Actual Billed Amount (உண்மை கட்டணம் - விருப்பத்தேர்வு)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
            <input
              id="total_amount"
              name="total_amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.total_amount ?? ''}
              onChange={handleInputChange}
              placeholder="e.g. 1725.00"
              aria-invalid={Boolean(errors.total_amount)}
              aria-describedby={errors.total_amount ? 'total_amount_error' : undefined}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {errors.total_amount && (
            <p id="total_amount_error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.total_amount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bill_reference_no" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Local Bill / Consumer Reference (உள்ளூர் குறிப்பு எண்)
          </label>
          <input
            id="bill_reference_no"
            name="bill_reference_no"
            type="text"
            value={formData.bill_reference_no}
            onChange={handleInputChange}
            placeholder="e.g. CA-04-129-8472 (kept private on device)"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Warnings & Tariff Verification Box */}
      {calculatedAmount !== undefined && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-xs space-y-1">
          <div className="flex justify-between font-medium text-gray-900 dark:text-gray-100">
            <span>Modeled Statutory Tariff Charge:</span>
            <span>₹{calculatedAmount.toFixed(2)}</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-amber-700 dark:text-amber-400">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleValidatePreview}
          className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Verify Calculation (சரிபார்)
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          {isSubmitting ? 'Saving Locally...' : 'Save Bill Locally (சேமி)'}
        </button>
      </div>
    </form>
  );
};
