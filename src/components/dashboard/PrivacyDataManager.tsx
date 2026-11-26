'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { rollbackBatch } from '../../core/storage/ingestion-storage';
import { clearDemoModeFlag } from '../../core/demo/synthetic-household';
import { useLanguage } from '../../locales/i18n';
import { Card, SectionHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldCheck, Download, Trash2, Undo2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

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
      setMessage(`Rolled back batch ${batchId} (${deletedCount} readings removed).`);
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
      clearDemoModeFlag();
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
    <div className={`space-y-5 ${className}`}>
      <SectionHeader title={t('privacyTitle')} subtitle={t('privacyDescription')} />

      {message && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-zinc-900 text-white text-xs font-medium flex items-center justify-between gap-3"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss status message"
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Privacy & Network Status Card */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('networkAuditTitle')}</h3>
              <p className="text-xs text-zinc-600 mt-0.5">{t('networkAuditPassing')}</p>
            </div>
          </div>
          <Badge variant="emerald" dot>
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('privacyBadgeShort')}</span>
          </Badge>
        </div>
      </Card>

      {/* Honest Browser Storage Risks Notice */}
      <Card className="p-5 border-amber-200 bg-amber-50/60">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">{t('storageLimitationsTitle')}</h4>
            <p className="mt-1 text-xs text-zinc-700 leading-relaxed">
              {t('storageLimitationsDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Export & Purge Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-semibold text-zinc-900">{t('exportBtn')}</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{t('exportDesc')}</p>
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={isExporting}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : t('exportBtn')}</span>
          </button>
        </Card>

        <Card className="p-5 sm:p-6 border-rose-200/80 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h4 className="text-sm font-semibold text-rose-700">{t('deleteBtnTitle')}</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{t('deleteBtnDesc')}</p>
          </div>

          {confirmDelete ? (
            <div className="space-y-2.5">
              <p className="text-xs text-rose-700 font-medium">{t('deleteConfirmMsg')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                >
                  {isDeleting ? 'Deleting...' : t('deleteConfirmBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[40px] py-2 px-3 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('deleteBtnTitle')}</span>
            </button>
          )}
        </Card>
      </div>

      {/* CSV Batch Rollback */}
      {batches.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Undo2 className="w-4 h-4 text-zinc-500" />
            <h4 className="text-sm font-semibold text-zinc-900">Import batches</h4>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Remove an imported CSV batch cleanly without affecting your utility bills or settings.
          </p>

          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs"
              >
                <div>
                  <span className="font-medium text-zinc-900">Batch: {b.id}</span>
                  <span className="ml-3 text-zinc-500 tabular-nums">
                    {b.count} readings
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRollback(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Rollback batch</span>
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
