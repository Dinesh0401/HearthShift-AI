'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { rollbackBatch } from '../../core/storage/ingestion-storage';
import { useLanguage } from '../../locales/i18n';
import { ShieldCheck, Download, Trash2, Undo2, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

interface PrivacyDataManagerProps {
  onDataPurged?: () => void;
  className?: string;
}

export const PrivacyDataManager: React.FC<PrivacyDataManagerProps> = ({
  onDataPurged,
  className = '',
}) => {
  const { t } = useLanguage();
  const [batches, setBatches] = useState<{ id: string; count: number }[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadBatches = async () => {
    try {
      const readings = await db.readings.toArray();
      const batchMap = new Map<string, number>();
      for (const r of readings) {
        if (r.import_batch_id) {
          batchMap.set(r.import_batch_id, (batchMap.get(r.import_batch_id) || 0) + 1);
        }
      }
      setBatches(Array.from(batchMap.entries()).map(([id, count]) => ({ id, count })));
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const data = await db.exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hearthshift_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Successfully exported unencrypted JSON backup.');
    } catch (err) {
      console.error('Export failed', err);
      setMessage('Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRollback = async (batchId: string) => {
    try {
      const deletedCount = await rollbackBatch(batchId);
      setMessage(`Successfully rolled back batch ${batchId} (${deletedCount} readings removed).`);
      await loadBatches();
      if (onDataPurged) onDataPurged();
    } catch (err) {
      console.error('Rollback failed', err);
      setMessage('Failed to rollback batch.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeleting(true);
      await db.deleteAllUserData();
      setMessage(t('deleteSuccessMsg'));
      setConfirmDelete(false);
      await loadBatches();
      if (onDataPurged) onDataPurged();
    } catch (err) {
      console.error('Purge failed', err);
      setMessage('Failed to delete data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Guarantee Banner */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              {t('privacyTitle')}
            </h3>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              {t('privacyDescription')}
            </p>
          </div>
        </div>

        {/* Audit Status */}
        <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('networkAuditPassing')}</span>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-blue-600 hover:text-blue-800 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Data Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {t('exportBtn')}
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              {t('exportDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : t('exportBtn')}
          </button>
        </div>

        {/* Delete All Data Card */}
        <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                {t('deleteBtnTitle')}
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              {t('deleteBtnDesc')}
            </p>
          </div>

          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-semibold text-center">
                {t('deleteConfirmMsg')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  {isDeleting ? 'Purging...' : 'Yes, Delete Everything'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('deleteBtnTitle')}
            </button>
          )}
        </div>
      </div>

      {/* CSV Batches Rollback Section */}
      {batches.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Undo2 className="w-5 h-5 text-gray-500" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Import Batches (Atomic Rollback Support)
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            If an imported CSV file contains errors, you can completely rollback the entire batch without affecting other data.
          </p>

          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-xs border border-gray-100 dark:border-gray-800"
              >
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Batch: {b.id}
                  </span>
                  <span className="ml-3 text-gray-500">
                    {b.count} readings recorded
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRollback(b.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Rollback Batch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
