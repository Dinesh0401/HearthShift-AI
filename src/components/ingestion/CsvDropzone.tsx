'use client';

import React, { useState, useRef } from 'react';
import {
  parseEnergyCsv,
  MAX_CSV_BYTES,
  type CsvValidationPreview,
  type CsvColumnMapping,
} from '../../core/ingestion/csv-parser';
import { commitValidatedReadings } from '../../core/storage/ingestion-storage';
import { useLanguage } from '../../locales/i18n';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { UploadCloud, Check, AlertTriangle } from 'lucide-react';

interface CsvDropzoneProps {
  onImportComplete?: (result: { batchId: string; count: number }) => void;
  className?: string;
}

export const CsvDropzone: React.FC<CsvDropzoneProps> = ({
  onImportComplete,
  className = '',
}) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedRows, setParsedRows] = useState(0);
  const [preview, setPreview] = useState<CsvValidationPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setErrorMsg(null);
    setCommitSuccess(null);
    setPreview(null);

    if (file.size > MAX_CSV_BYTES) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMb = Math.round(MAX_CSV_BYTES / (1024 * 1024));
      setErrorMsg(
        `File "${file.name}" (${fileSizeMb} MB) exceeds the maximum allowed size of ${maxSizeMb} MB.`
      );
      return;
    }

    setIsParsing(true);
    setProgress(0);
    setParsedRows(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const textContent = await file.text();
      const mapping: CsvColumnMapping = {
        timezone_offset: '+05:30',
      };

      const result = await parseEnergyCsv(textContent, {
        mapping,
        abort_signal: abortController.signal,
        on_progress: (prog, parsed) => {
          setProgress(prog);
          setParsedRows(parsed);
        },
      });

      result.file_name = file.name;
      setPreview(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelParsing = () => {
    abortControllerRef.current?.abort();
  };

  const handleCommitReadings = async () => {
    if (!preview || preview.readings.length === 0) return;

    try {
      setIsCommitting(true);
      const commitRes = await commitValidatedReadings(preview.readings, preview.file_name);
      setCommitSuccess(
        `Saved ${commitRes.records_committed.toLocaleString()} interval readings locally (Batch: ${commitRes.import_batch_id}).`
      );
      setPreview(null);
      if (onImportComplete) {
        onImportComplete({
          batchId: commitRes.import_batch_id,
          count: commitRes.records_committed,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save readings to IndexedDB.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Card className={`p-5 sm:p-6 space-y-4 ${className}`}>
      <div className="border-b border-zinc-100 pb-3">
        <h3 className="text-base font-semibold text-zinc-900">{t('csvTitle')}</h3>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{t('csvSubtitle')}</p>
      </div>

      {commitSuccess && (
        <div
          role="status"
          className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!preview && !isParsing && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload smart-meter CSV file. Click or press Enter or Space to browse local files."
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center p-10 border border-dashed rounded-2xl cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/50'
              : 'border-zinc-300 hover:border-emerald-500 bg-zinc-50/50'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-emerald-600 mb-3">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-zinc-900 text-center">{t('csvDropTitle')}</p>
          <p className="text-xs text-zinc-500 mt-1 text-center">{t('csvDropHint')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {isParsing && (
        <div className="p-5 border border-zinc-200 rounded-xl bg-zinc-50 space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-zinc-700">
            <span>Parsing CSV on device ({parsedRows.toLocaleString()} rows)</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCancelParsing}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="border border-zinc-200 rounded-2xl bg-zinc-50/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                CSV Validation Preview ({preview.file_name})
              </span>
              <Badge variant="emerald">Resolution: {preview.detected_resolution}</Badge>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              Discard
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-zinc-200">
              <span className="text-zinc-500 block">Valid readings</span>
              <span className="text-base font-semibold text-zinc-900 tabular-nums">
                {preview.valid_readings_count.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-zinc-200">
              <span className="text-zinc-500 block">Total energy</span>
              <span className="text-base font-semibold text-zinc-900 tabular-nums">
                {preview.total_consumption_kwh.toLocaleString()} kWh
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-zinc-200">
              <span className="text-zinc-500 block">Daily average</span>
              <span className="text-base font-semibold text-zinc-900 tabular-nums">
                {preview.average_daily_kwh} kWh/day
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-zinc-200">
              <span className="text-zinc-500 block">Duplicates / errors</span>
              <span className="text-base font-semibold text-zinc-900 tabular-nums">
                {preview.duplicate_count} / {preview.error_count}
              </span>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
              <span className="font-semibold block">Data quality notices</span>
              <ul className="list-disc list-inside space-y-0.5">
                {preview.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <span className="text-xs font-medium text-zinc-600 mb-1.5 block">
              Sample verified intervals
            </span>
            <table className="w-full text-xs text-left border border-zinc-200 rounded-xl overflow-hidden bg-white">
              <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200">
                <tr>
                  <th className="py-2 px-3 font-medium">Timestamp</th>
                  <th className="py-2 px-3 font-medium text-right">Energy (kWh)</th>
                  <th className="py-2 px-3 font-medium text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {preview.sample_readings.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-mono">{r.timestamp}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium tabular-nums">
                      {r.value_kwh.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right">{r.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-4 py-2 min-h-[40px] text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              disabled={isCommitting}
              onClick={handleCommitReadings}
              className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl"
            >
              {isCommitting
                ? 'Saving...'
                : `Confirm & Save ${preview.valid_readings_count.toLocaleString()} Readings`}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
