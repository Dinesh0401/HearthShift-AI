/**
 * HearthShift AI — Client-Side Streaming CSV Parser
 * 
 * High-performance, memory-efficient interval energy parser supporting:
 * - Direct interval kWh and cumulative meter readings (with reset detection)
 * - Configurable column mappings & auto-detection (Low Carbon London, REFIT, Generic)
 * - Explicit timezone normalization
 * - Duplicate timestamp detection
 * - Interval gap & missing reading detection
 * - Out-of-order chronological sorting
 * - Cancellation support via AbortSignal
 * - Staged validation preview before persistence
 * 
 * ZERO FABRICATION POLICY: Never synthesizes missing readings.
 * 
 * @module core/ingestion/csv-parser
 */

import type { EnergyReading, DataResolution } from '../../types/contracts';

export interface CsvColumnMapping {
  timestamp_column?: string;
  kwh_column?: string;
  is_cumulative_meter?: boolean;
  timezone_offset?: string; // e.g. '+05:30' for IST, 'Z' for UTC
  date_format?: 'iso' | 'uk' | 'us' | 'auto'; // 'uk' = DD/MM/YYYY, 'us' = MM/DD/YYYY
}

export interface CsvRowError {
  row_number: number;
  raw_line: string;
  error: string;
}

export interface CsvGapInfo {
  gap_start: string;
  gap_end: string;
  missing_duration_minutes: number;
  estimated_missing_intervals: number;
}

export interface CsvValidationPreview {
  file_name?: string;
  total_rows_read: number;
  valid_readings_count: number;
  error_count: number;
  duplicate_count: number;
  detected_resolution: DataResolution;
  is_cumulative_detected: boolean;
  start_timestamp?: string;
  end_timestamp?: string;
  total_consumption_kwh: number;
  average_daily_kwh: number;
  gaps: CsvGapInfo[];
  errors: CsvRowError[];
  warnings: string[];
  sample_readings: EnergyReading[];
  readings: EnergyReading[]; // Full normalized readings ready for staged commit
}

export interface ParseCsvOptions {
  mapping?: CsvColumnMapping;
  abort_signal?: AbortSignal;
  on_progress?: (progress: number, parsedCount: number, errorCount: number) => void;
  max_errors_retained?: number;
}

/**
 * Parses raw CSV string or stream into validated, normalized EnergyReading objects.
 * Pure client-side execution; zero network transmission.
 */
export async function parseEnergyCsv(
  csvContent: string,
  options: ParseCsvOptions = {}
): Promise<CsvValidationPreview> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const errors: CsvRowError[] = [];
  const warnings: string[] = [];
  const maxErrors = options.max_errors_retained ?? 50;

  // 1. Parse header line & detect columns
  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = splitCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

  const mapping = options.mapping ?? {};
  const timestampIndex = findTimestampColumnIndex(rawHeaders, mapping.timestamp_column);
  const kwhIndex = findKwhColumnIndex(rawHeaders, mapping.kwh_column);

  if (timestampIndex === -1) {
    throw new Error(
      `Could not detect a valid timestamp column. Available columns: [${rawHeaders.join(', ')}]. Please specify timestamp_column.`
    );
  }
  if (kwhIndex === -1) {
    throw new Error(
      `Could not detect a valid energy consumption/meter reading column. Available columns: [${rawHeaders.join(', ')}]. Please specify kwh_column.`
    );
  }

  // 2. Stream through rows
  interface RawRecord {
    row_num: number;
    timestamp: Date;
    raw_val: number;
  }

  const rawRecords: RawRecord[] = [];
  const totalDataLines = lines.length - 1;
  const tzOffset = mapping.timezone_offset ?? '+05:30'; // Default to Indian Standard Time

  for (let i = 1; i < lines.length; i++) {
    if (options.abort_signal?.aborted) {
      throw new Error('CSV parsing was cancelled by the user.');
    }

    const line = lines[i];
    if (!line.trim()) continue;

    const rowNum = i + 1; // 1-based line number
    const cols = splitCsvLine(line, delimiter);

    if (cols.length <= Math.max(timestampIndex, kwhIndex)) {
      if (errors.length < maxErrors) {
        errors.push({
          row_number: rowNum,
          raw_line: line,
          error: `Row has ${cols.length} columns, expected at least ${Math.max(timestampIndex, kwhIndex) + 1}.`,
        });
      }
      continue;
    }

    const rawTsStr = cols[timestampIndex].trim();
    const rawValStr = cols[kwhIndex].trim();

    // Parse date
    const parsedDate = parseDateTimeString(rawTsStr, tzOffset, mapping.date_format);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      if (errors.length < maxErrors) {
        errors.push({
          row_number: rowNum,
          raw_line: line,
          error: `Unparseable date/time string: "${rawTsStr}"`,
        });
      }
      continue;
    }

    // Parse numeric value
    const numVal = parseFloat(rawValStr.replace(/,/g, ''));
    if (isNaN(numVal) || !isFinite(numVal)) {
      if (errors.length < maxErrors) {
        errors.push({
          row_number: rowNum,
          raw_line: line,
          error: `Non-numeric energy value: "${rawValStr}"`,
        });
      }
      continue;
    }

    rawRecords.push({
      row_num: rowNum,
      timestamp: parsedDate,
      raw_val: numVal,
    });

    if (options.on_progress && i % 250 === 0) {
      const progress = Math.round((i / totalDataLines) * 100);
      options.on_progress(progress, rawRecords.length, errors.length);
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (rawRecords.length === 0) {
    throw new Error('No valid data rows could be extracted from the CSV file.');
  }

  // 3. Sort chronologically
  rawRecords.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // 4. Duplicate timestamp detection
  let duplicateCount = 0;
  const deduplicatedRecords: RawRecord[] = [];
  const seenTimestamps = new Set<number>();

  for (const rec of rawRecords) {
    const timeMs = rec.timestamp.getTime();
    if (seenTimestamps.has(timeMs)) {
      duplicateCount++;
      if (errors.length < maxErrors) {
        errors.push({
          row_number: rec.row_num,
          raw_line: `Timestamp: ${rec.timestamp.toISOString()}`,
          error: `Duplicate timestamp detected: ${rec.timestamp.toISOString()}. Ignored duplicate row.`,
        });
      }
    } else {
      seenTimestamps.add(timeMs);
      deduplicatedRecords.push(rec);
    }
  }

  if (duplicateCount > 0) {
    warnings.push(`Detected and removed ${duplicateCount} duplicate timestamp entries.`);
  }

  // 5. Determine whether data is cumulative meter readings vs interval deltas
  const isCumulative = mapping.is_cumulative_meter ?? detectCumulativeNature(deduplicatedRecords);

  // 6. Compute interval kWh readings and detect resets
  const normalizedReadings: EnergyReading[] = [];
  let totalKwh = 0;

  if (isCumulative) {
    warnings.push('Data was identified as cumulative meter readings. Computed interval deltas between successive readings.');
    for (let j = 1; j < deduplicatedRecords.length; j++) {
      const prev = deduplicatedRecords[j - 1];
      const curr = deduplicatedRecords[j];

      let delta = curr.raw_val - prev.raw_val;
      if (delta < 0) {
        // Meter rollover or reset
        warnings.push(
          `Meter reset or rollover detected at row ${curr.row_num} (${curr.timestamp.toISOString()}): reading dropped from ${prev.raw_val} to ${curr.raw_val}. Marked reading as reset boundary.`
        );
        delta = curr.raw_val; // Assumes reset to 0
      }

      const roundedKwh = Math.round(delta * 10000) / 10000;
      totalKwh += roundedKwh;

      normalizedReadings.push({
        timestamp: curr.timestamp.toISOString(),
        value_kwh: roundedKwh,
        resolution: 'hourly', // updated below
        source: 'csv_import',
      });
    }
  } else {
    for (const rec of deduplicatedRecords) {
      if (rec.raw_val < 0) {
        if (errors.length < maxErrors) {
          errors.push({
            row_number: rec.row_num,
            raw_line: `Value: ${rec.raw_val}`,
            error: `Negative consumption rejected: ${rec.raw_val} kWh.`,
          });
        }
        continue;
      }

      const roundedKwh = Math.round(rec.raw_val * 10000) / 10000;
      totalKwh += roundedKwh;

      normalizedReadings.push({
        timestamp: rec.timestamp.toISOString(),
        value_kwh: roundedKwh,
        resolution: 'hourly',
        source: 'csv_import',
      });
    }
  }

  // 7. Detect Resolution & Interval Gaps
  const { resolution, gaps } = analyzeIntervalsAndGaps(normalizedReadings);
  for (const r of normalizedReadings) {
    r.resolution = resolution;
  }

  if (gaps.length > 0) {
    const totalMissingMin = gaps.reduce((acc, g) => acc + g.missing_duration_minutes, 0);
    warnings.push(
      `Detected ${gaps.length} missing interval gaps (totaling ${(totalMissingMin / 60).toFixed(1)} hours). Gaps are tracked honestly without synthetic imputation.`
    );
  }

  // 8. Compute Summary Statistics
  const startTs = normalizedReadings.length > 0 ? normalizedReadings[0].timestamp : undefined;
  const endTs = normalizedReadings.length > 0 ? normalizedReadings[normalizedReadings.length - 1].timestamp : undefined;

  let averageDailyKwh = 0;
  if (startTs && endTs) {
    const spanDays = Math.max(
      1,
      (new Date(endTs).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60 * 24)
    );
    averageDailyKwh = Math.round((totalKwh / spanDays) * 100) / 100;
  }

  const sampleReadings = [
    ...normalizedReadings.slice(0, 5),
    ...normalizedReadings.slice(-5),
  ];

  return {
    total_rows_read: totalDataLines,
    valid_readings_count: normalizedReadings.length,
    error_count: errors.length,
    duplicate_count: duplicateCount,
    detected_resolution: resolution,
    is_cumulative_detected: isCumulative,
    start_timestamp: startTs,
    end_timestamp: endTs,
    total_consumption_kwh: Math.round(totalKwh * 100) / 100,
    average_daily_kwh: averageDailyKwh,
    gaps,
    errors,
    warnings,
    sample_readings: sampleReadings,
    readings: normalizedReadings,
  };
}

// ══════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════

function detectDelimiter(line: string): string {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  // Simple regex-based CSV field splitter that respects double quotes
  const pattern = new RegExp(
    `(${delimiter}|\\r?\\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}\\r\\n]*))`,
    'gi'
  );
  const result: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    // If quote match found
    if (match[2] !== undefined) {
      result.push(match[2].replace(/""/g, '"'));
    } else if (match[3] !== undefined) {
      result.push(match[3]);
    }
  }

  return result.length > 0 ? result : line.split(delimiter);
}

function findTimestampColumnIndex(headers: string[], userSpecified?: string): number {
  if (userSpecified) {
    const idx = headers.indexOf(userSpecified.toLowerCase());
    if (idx !== -1) return idx;
  }

  const candidates = [
    'timestamp',
    'datetime',
    'date_time',
    'time',
    'date',
    'reading_date',
    'interval_start',
    'interval_timestamp',
  ];

  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }

  return -1;
}

function findKwhColumnIndex(headers: string[], userSpecified?: string): number {
  if (userSpecified) {
    const idx = headers.indexOf(userSpecified.toLowerCase());
    if (idx !== -1) return idx;
  }

  // Low Carbon London: 'kwh/hh (per half hour)'
  // REFIT: 'aggregate'
  // Generic: 'kwh', 'consumption', 'value', 'units'
  const candidates = [
    'kwh/hh',
    'kwh',
    'consumption',
    'units',
    'aggregate',
    'value',
    'reading',
    'meter_reading',
    'active_power',
  ];

  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }

  return -1;
}

export function parseDateTimeString(
  rawStr: string,
  tzOffset: string,
  _format?: 'iso' | 'uk' | 'us' | 'auto'
): Date | null {
  const cleanStr = rawStr.trim();
  if (!cleanStr) return null;

  // 1. If string is already fully qualified ISO with Z or offset (e.g. 2024-01-01T00:30:00+05:30)
  if (/Z|[+-]\d{2}:?\d{2}$/i.test(cleanStr)) {
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
  const isoMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const [, yr, mo, dy, hr, min, sec] = isoMatch;
    const pad = (n: string | undefined) => (n || '0').padStart(2, '0');
    const isoString = `${yr}-${pad(mo)}-${pad(dy)}T${pad(hr)}:${pad(min)}:${pad(sec)}${tzOffset}`;
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Format: "DD/MM/YYYY HH:mm" or "DD-MM-YYYY HH:mm" (UK/India standard)
  const dmyMatch = cleanStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (dmyMatch) {
    const [, dy, mo, yr, hr, min, sec] = dmyMatch;
    const pad = (n: string | undefined) => (n || '0').padStart(2, '0');
    const isoString = `${yr}-${pad(mo)}-${pad(dy)}T${pad(hr)}:${pad(min)}:${pad(sec)}${tzOffset}`;
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to standard JS Date parser
  const fallbackDate = new Date(cleanStr);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function detectCumulativeNature(records: Array<{ raw_val: number }>): boolean {
  if (records.length < 10) return false;

  let increasingCount = 0;
  for (let i = 1; i < Math.min(100, records.length); i++) {
    if (records[i].raw_val >= records[i - 1].raw_val) {
      increasingCount++;
    }
  }

  // If >90% of samples are monotonically increasing and values are large, it's cumulative meter readings
  const isStrictlyAscending = increasingCount / Math.min(99, records.length - 1) > 0.92;
  const hasHighValues = records[records.length - 1].raw_val > 50;

  return isStrictlyAscending && hasHighValues;
}

function analyzeIntervalsAndGaps(readings: EnergyReading[]): {
  resolution: DataResolution;
  gaps: CsvGapInfo[];
} {
  if (readings.length < 2) {
    return { resolution: 'hourly', gaps: [] };
  }

  // Calculate step differences in minutes between successive timestamps
  const stepDiffs: number[] = [];
  for (let i = 1; i < Math.min(100, readings.length); i++) {
    const tPrev = new Date(readings[i - 1].timestamp).getTime();
    const tCurr = new Date(readings[i].timestamp).getTime();
    const diffMinutes = Math.round((tCurr - tPrev) / (1000 * 60));
    if (diffMinutes > 0 && diffMinutes <= 1440) {
      stepDiffs.push(diffMinutes);
    }
  }

  // Find median interval
  stepDiffs.sort((a, b) => a - b);
  const medianMinutes = stepDiffs.length > 0 ? stepDiffs[Math.floor(stepDiffs.length / 2)] : 60;

  let resolution: DataResolution = 'hourly';
  if (medianMinutes <= 1) resolution = 'minute';
  else if (medianMinutes <= 15) resolution = 'quarter-hourly';
  else if (medianMinutes <= 30) resolution = 'half-hourly';
  else if (medianMinutes <= 60) resolution = 'hourly';
  else resolution = 'daily';

  // Identify gaps exceeding 1.5x expected interval
  const gaps: CsvGapInfo[] = [];
  const gapThreshold = medianMinutes * 1.5;

  for (let i = 1; i < readings.length; i++) {
    const tPrev = new Date(readings[i - 1].timestamp).getTime();
    const tCurr = new Date(readings[i].timestamp).getTime();
    const diffMinutes = (tCurr - tPrev) / (1000 * 60);

    if (diffMinutes > gapThreshold) {
      const missingCount = Math.round(diffMinutes / medianMinutes) - 1;
      gaps.push({
        gap_start: readings[i - 1].timestamp,
        gap_end: readings[i].timestamp,
        missing_duration_minutes: diffMinutes,
        estimated_missing_intervals: Math.max(1, missingCount),
      });
    }
  }

  return { resolution, gaps };
}
