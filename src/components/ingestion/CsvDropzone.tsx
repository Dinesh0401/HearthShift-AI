'use client';

import React, { useState, useRef } from 'react';
import { parseEnergyCsv, type CsvValidationPreview, type CsvColumnMapping } from '../../core/ingestion/csv-parser';
import { commitValidatedReadings } from '../../core/storage/ingestion-storage';

interface CsvDropzoneProps {
  onImportComplete?: (result: { batchId: string; count: number }) => void;
  className?: string;
}

export const CsvDropzone: React.FC<CsvDropzoneProps> = ({
  onImportComplete,
  className = '',
}) => {
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
      const file = e.dataTransfer.files[0];
      await processSelectedFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    setErrorMsg(null);
    setCommitSuccess(null);
    setPreview(null);
    setIsParsing(true);
    setProgress(0);
    setParsedRows(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const textContent = await file.text();
      const mapping: CsvColumnMapping = {
        timezone_offset: '+05:30', // India Standard Time default
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCommitReadings = async () => {
    if (!preview || preview.readings.length === 0) return;

    try {
      setIsCommitting(true);
      const commitRes = await commitValidatedReadings(preview.readings, preview.file_name);
      setCommitSuccess(
        `Successfully saved ${commitRes.records_committed.toLocaleString()} interval readings locally (Batch ID: ${commitRes.import_batch_id}).`
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
    <div className={`space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Smart-Meter CSV Importer
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ஸ்மார்ட் மீட்டர் CSV பதிவேற்றம் · 15m, 30m, or 1-hour interval data. Zero network upload — parsed and stored locally.
        </p>
      </div>

      {commitSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm">
          ✓ {commitSuccess}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Drag & Drop Zone */}
      {!preview && !isParsing && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-emerald-400 bg-gray-50/50 dark:bg-gray-800/40'
          }`}
        >
          <span className="text-3xl mb-2" aria-hidden="true">📁</span>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center">
            Drop smart-meter CSV file here, or click to browse
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Supports Low Carbon London, REFIT, or generic timestamp + kWh formats (up to 500,000 rows).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Parsing Progress Bar */}
      {isParsing && (
        <div className="p-6 border rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300">
            <span>Parsing CSV in browser memory... ({parsedRows.toLocaleString()} rows verified)</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCancelParsing}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Cancel Parsing (ரத்துசெய்)
            </button>
          </div>
        </div>
      )}

      {/* Validation Preview Modal / Stage */}
      {preview && (
        <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                CSV Validation Preview ({preview.file_name})
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Resolution: {preview.detected_resolution}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Discard (விலக்கு)
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 block">Valid Readings</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {preview.valid_readings_count.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 block">Total Energy</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {preview.total_consumption_kwh.toLocaleString()} kWh
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 block">Average Daily</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {preview.average_daily_kwh} kWh/day
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 block">Duplicates / Errors</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {preview.duplicate_count} / {preview.error_count}
              </span>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <span className="font-semibold block">Data Quality Notices:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {preview.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample Readings Table */}
          <div className="overflow-x-auto">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
              Sample Verified Readings (First & Last Intervals):
            </span>
            <table className="w-full text-xs text-left border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-2">Timestamp (UTC / Offset)</th>
                  <th className="p-2">Interval Energy (kWh)</th>
                  <th className="p-2">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                {preview.sample_readings.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 font-mono">{r.timestamp}</td>
                    <td className="p-2 font-mono font-semibold">{r.value_kwh.toFixed(4)}</td>
                    <td className="p-2">{r.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg"
            >
              Cancel (ரத்து)
            </button>
            <button
              type="button"
              disabled={isCommitting}
              onClick={handleCommitReadings}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm"
            >
              {isCommitting ? 'Committing Locally...' : `Confirm & Save ${preview.valid_readings_count.toLocaleString()} Readings`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
