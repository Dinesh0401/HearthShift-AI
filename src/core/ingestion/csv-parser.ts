/**
 * HearthShift AI — Client-Side Streaming CSV Parser
 * 
 * High-performance, physically grounded interval energy & power parser supporting:
 * - Distinct measurement semantics:
 *     1. Interval Energy (kWh) (e.g. Low Carbon London KWH/hh)
 *     2. Instantaneous / Interval Power (Watts) with trapezoidal time-integration (e.g. REFIT Aggregate)
 *     3. Cumulative Meter Register (kWh) with strict reset / rollover discontinuity gating
 * - Auto-detection and explicit column/unit confirmation
 * - Explicit timezone normalization
 * - Duplicate timestamp detection
 * - Interval gap & missing reading detection
 * - Out-of-order chronological sorting
 * - Cancellation support via AbortSignal
 * - Staged validation preview before persistence
 * 
 * ZERO FABRICATION POLICY: Never synthesizes missing readings. Never invents deltas across meter resets.
 * 
 * @module core/ingestion/csv-parser
 */

import type { EnergyReading, DataResolution, MeasurementKind } from '../../types/contracts';

export interface CsvColumnMapping {
  timestamp_column?: string;
  data_column?: string;
  measurement_kind?: MeasurementKind;
  is_cumulative_meter?: boolean;
  /** Known rollover modulus in kWh (e.g. 100000 for 5-digit meter) */
  rollover_modulus_kwh?: number;
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

export interface CsvDiscontinuityBoundary {
  timestamp: string;
  row_number: number;
  previous_reading: number;
  new_reading: number;
  reason: string;
}

export interface CsvValidationPreview {
  file_name?: string;
  total_rows_read: number;
  valid_readings_count: number;
  error_count: number;
  duplicate_count: number;
  detected_resolution: DataResolution;
  measurement_kind: MeasurementKind;
  is_cumulative_detected?: boolean;
  source_unit: string;
  start_timestamp?: string;
  end_timestamp?: string;
  total_consumption_kwh: number;
  average_daily_kwh: number;
  gaps: CsvGapInfo[];
  discontinuities: CsvDiscontinuityBoundary[];
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
 * Parses raw CSV string into validated, normalized EnergyReading objects with strict physical units.
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
  const discontinuities: CsvDiscontinuityBoundary[] = [];
  const maxErrors = options.max_errors_retained ?? 50;

  // 1. Parse header line & detect columns
  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = splitCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

  const mapping = options.mapping ?? {};
  const timestampIndex = findTimestampColumnIndex(rawHeaders, mapping.timestamp_column);
  const { dataIndex, detectedKind, detectedUnit } = findDataColumnIndex(
    rawHeaders,
    mapping.data_column,
    mapping.measurement_kind
  );

  if (timestampIndex === -1) {
    throw new Error(
      `Could not detect a valid timestamp column. Available columns: [${rawHeaders.join(', ')}]. Please specify timestamp_column.`
    );
  }
  if (dataIndex === -1) {
    throw new Error(
      `Could not detect a valid energy or power column. Available columns: [${rawHeaders.join(', ')}]. Please specify data_column.`
    );
  }

  const measurementKind: MeasurementKind =
    mapping.measurement_kind ??
    (mapping.is_cumulative_meter ? 'cumulative_meter_kwh' : detectedKind);
  const sourceUnit = detectedUnit;

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

    if (cols.length <= Math.max(timestampIndex, dataIndex)) {
      if (errors.length < maxErrors) {
        errors.push({
          row_number: rowNum,
          raw_line: line,
          error: `Row has ${cols.length} columns, expected at least ${Math.max(timestampIndex, dataIndex) + 1}.`,
        });
      }
      continue;
    }

    const rawTsStr = cols[timestampIndex].trim();
    const rawValStr = cols[dataIndex].trim();

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
          error: `Non-numeric value: "${rawValStr}"`,
        });
      }
      continue;
    }

    rawRecords.push({
      row_num: rowNum,
      timestamp: parsedDate,
      raw_val: numVal,
    });

    if (options.on_progress && i % 500 === 0) {
      const progress = Math.round((i / totalDataLines) * 100);
      options.on_progress(progress, rawRecords.length, errors.length);
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

  // 5. Process according to physical measurement semantics
  const normalizedReadings: EnergyReading[] = [];
  let totalKwh = 0;

  if (measurementKind === 'instantaneous_power_w' || measurementKind === 'average_power_w') {
    // ══════════════════════════════════════════════════════════
    // POWER (Watts) INTEGRATION: E = Integral P dt
    // ══════════════════════════════════════════════════════════
    warnings.push(
      `Interpreted column as electrical power in Watts (${sourceUnit}). Converted to energy (kWh) via trapezoidal numerical integration over sample durations.`
    );

    for (let j = 1; j < deduplicatedRecords.length; j++) {
      const prev = deduplicatedRecords[j - 1];
      const curr = deduplicatedRecords[j];

      const dtSeconds = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      if (dtSeconds <= 0) continue;

      if (prev.raw_val < 0 || curr.raw_val < 0) {
        if (errors.length < maxErrors) {
          errors.push({
            row_number: curr.row_num,
            raw_line: `Power: ${curr.raw_val} W`,
            error: `Negative power rejected: ${curr.raw_val} W.`,
          });
        }
        continue;
      }

      // If gap exceeds 300 seconds (5 minutes) in high-frequency power data, do not integrate across the gap!
      if (dtSeconds > 300) {
        warnings.push(
          `Sampling gap of ${(dtSeconds / 60).toFixed(1)} minutes between row ${prev.row_num} and ${curr.row_num}. Omitted integration across gap to prevent fabricated energy.`
        );
        continue;
      }

      // Trapezoidal rule: E_kWh = ((P_prev + P_curr) / 2) * (dt / 3,600,000)
      const avgWatts = (prev.raw_val + curr.raw_val) / 2;
      const energyKwh = (avgWatts * dtSeconds) / 3600000;
      const roundedKwh = Math.round(energyKwh * 100000) / 100000; // 5 decimal places for sub-minute power
      totalKwh += roundedKwh;

      normalizedReadings.push({
        timestamp: curr.timestamp.toISOString(),
        value_kwh: roundedKwh,
        resolution: dtSeconds < 60 ? 'sub-minute' : dtSeconds <= 900 ? 'quarter-hourly' : 'hourly',
        source: 'csv_import',
        measurement_kind: measurementKind,
        raw_value: curr.raw_val,
        raw_unit: sourceUnit,
        power_watts: curr.raw_val,
        interval_duration_seconds: dtSeconds,
      });
    }
  } else if (measurementKind === 'cumulative_meter_kwh') {
    // ══════════════════════════════════════════════════════════
    // CUMULATIVE METER REGISTER: E_t = M_t - M_{t-1}
    // ══════════════════════════════════════════════════════════
    warnings.push(
      'Interpreted column as cumulative meter index (kWh). Computed interval consumption deltas.'
    );

    const rolloverModulus = mapping.rollover_modulus_kwh;

    for (let j = 1; j < deduplicatedRecords.length; j++) {
      const prev = deduplicatedRecords[j - 1];
      const curr = deduplicatedRecords[j];

      let delta = curr.raw_val - prev.raw_val;

      if (delta < 0) {
        // Meter reset or rollover!
        let isPlausibleRollover = false;
        if (rolloverModulus && rolloverModulus > 0) {
          const rolloverDelta = curr.raw_val + rolloverModulus - prev.raw_val;
          // Plausible if consumption is reasonable (e.g. <= 50 kWh for domestic interval)
          if (rolloverDelta > 0 && rolloverDelta <= 50) {
            delta = rolloverDelta;
            isPlausibleRollover = true;
            warnings.push(
              `Meter rollover detected at row ${curr.row_num}: reading rolled over modulus ${rolloverModulus} (${prev.raw_val} -> ${curr.raw_val}). Delta of ${rolloverDelta.toFixed(3)} kWh applied.`
            );
          }
        }

        if (!isPlausibleRollover) {
          // STRICT RULE: Never invent consumption across a reset without verified metadata!
          discontinuities.push({
            timestamp: curr.timestamp.toISOString(),
            row_number: curr.row_num,
            previous_reading: prev.raw_val,
            new_reading: curr.raw_val,
            reason: `Meter reading dropped from ${prev.raw_val} to ${curr.raw_val}. Marked as discontinuity boundary; delta omitted to prevent fabricated consumption.`,
          });

          warnings.push(
            `Meter reset or rollover boundary at row ${curr.row_num} (${curr.timestamp.toISOString()}): reading dropped from ${prev.raw_val} to ${curr.raw_val}. Omitted delta from total energy.`
          );

          normalizedReadings.push({
            timestamp: curr.timestamp.toISOString(),
            value_kwh: 0,
            resolution: 'hourly',
            source: 'csv_import',
            measurement_kind: 'cumulative_meter_kwh',
            raw_value: curr.raw_val,
            raw_unit: sourceUnit,
            is_discontinuity_boundary: true,
          });
          continue;
        }
      }

      const roundedKwh = Math.round(delta * 10000) / 10000;
      totalKwh += roundedKwh;

      normalizedReadings.push({
        timestamp: curr.timestamp.toISOString(),
        value_kwh: roundedKwh,
        resolution: 'hourly',
        source: 'csv_import',
        measurement_kind: 'cumulative_meter_kwh',
        raw_value: curr.raw_val,
        raw_unit: sourceUnit,
      });
    }
  } else {
    // ══════════════════════════════════════════════════════════
    // DIRECT INTERVAL ENERGY (kWh) (e.g. Low Carbon London)
    // ══════════════════════════════════════════════════════════
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
        measurement_kind: 'interval_energy_kwh',
        raw_value: rec.raw_val,
        raw_unit: sourceUnit,
      });
    }
  }

  // 6. Detect Resolution & Interval Gaps
  const { resolution, gaps } = analyzeIntervalsAndGaps(normalizedReadings);
  for (const r of normalizedReadings) {
    if (r.resolution !== 'sub-minute') {
      r.resolution = resolution;
    }
  }

  if (gaps.length > 0) {
    const totalMissingMin = gaps.reduce((acc, g) => acc + g.missing_duration_minutes, 0);
    warnings.push(
      `Detected ${gaps.length} missing interval gaps (totaling ${(totalMissingMin / 60).toFixed(1)} hours). Gaps are tracked honestly without synthetic imputation.`
    );
  }

  // 7. Compute Summary Statistics
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
    measurement_kind: measurementKind,
    is_cumulative_detected: measurementKind === 'cumulative_meter_kwh',
    source_unit: sourceUnit,
    start_timestamp: startTs,
    end_timestamp: endTs,
    total_consumption_kwh: Math.round(totalKwh * 10000) / 10000,
    average_daily_kwh: averageDailyKwh,
    gaps,
    discontinuities,
    errors,
    warnings,
    sample_readings: sampleReadings,
    readings: normalizedReadings,
  };
}

// ══════════════════════════════════════════════════════════
// Helper Functions & Explicit Semantic Analyzers
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
  const pattern = new RegExp(
    `(${delimiter}|\\r?\\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}\\r\\n]*))`,
    'gi'
  );
  const result: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
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
    'unix',
  ];

  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }

  return -1;
}

interface DetectedDataColumn {
  dataIndex: number;
  detectedKind: MeasurementKind;
  detectedUnit: string;
}

function findDataColumnIndex(
  headers: string[],
  userSpecified?: string,
  userKind?: MeasurementKind
): DetectedDataColumn {
  if (userSpecified) {
    const idx = headers.indexOf(userSpecified.toLowerCase());
    if (idx !== -1) {
      return {
        dataIndex: idx,
        detectedKind: userKind ?? 'interval_energy_kwh',
        detectedUnit: userKind === 'instantaneous_power_w' ? 'W' : 'kWh',
      };
    }
  }

  // 1. REFIT pattern: 'aggregate' (Active power in Watts, ~8s sampling)
  const refitIdx = headers.findIndex((h) => h === 'aggregate' || h.includes('aggregate'));
  if (refitIdx !== -1) {
    return {
      dataIndex: refitIdx,
      detectedKind: 'instantaneous_power_w',
      detectedUnit: 'W (Watts)',
    };
  }

  // 2. Active Power patterns in Watts / kW
  const powerIdx = headers.findIndex((h) => h.includes('watt') || h.includes('active_power') || h.endsWith('_w'));
  if (powerIdx !== -1) {
    return {
      dataIndex: powerIdx,
      detectedKind: 'instantaneous_power_w',
      detectedUnit: 'W (Watts)',
    };
  }

  // 3. Low Carbon London: 'kwh/hh (per half hour)'
  const lclIdx = headers.findIndex((h) => h.includes('kwh/hh'));
  if (lclIdx !== -1) {
    return {
      dataIndex: lclIdx,
      detectedKind: 'interval_energy_kwh',
      detectedUnit: 'kWh/hh',
    };
  }

  // 4. Cumulative Meter index
  const meterIdx = headers.findIndex((h) => h.includes('meter_reading') || h.includes('register') || h.includes('cumulative'));
  if (meterIdx !== -1) {
    return {
      dataIndex: meterIdx,
      detectedKind: 'cumulative_meter_kwh',
      detectedUnit: 'kWh (cumulative register)',
    };
  }

  // 5. Generic Energy (kWh)
  const kwhIdx = headers.findIndex((h) => h.includes('kwh') || h.includes('consumption') || h.includes('units') || h.includes('energy') || h === 'value');
  if (kwhIdx !== -1) {
    return {
      dataIndex: kwhIdx,
      detectedKind: 'interval_energy_kwh',
      detectedUnit: 'kWh',
    };
  }

  return { dataIndex: -1, detectedKind: 'interval_energy_kwh', detectedUnit: 'unknown' };
}

export function parseDateTimeString(
  rawStr: string,
  tzOffset: string,
  _format?: 'iso' | 'uk' | 'us' | 'auto'
): Date | null {
  const cleanStr = rawStr.trim();
  if (!cleanStr) return null;

  // Unix epoch timestamp (seconds or milliseconds)
  if (/^\d{10}(\.\d+)?$/.test(cleanStr)) {
    return new Date(parseFloat(cleanStr) * 1000);
  }
  if (/^\d{13}$/.test(cleanStr)) {
    return new Date(parseInt(cleanStr, 10));
  }

  // If string is already fully qualified ISO with Z or offset
  if (/Z|[+-]\d{2}:?\d{2}$/i.test(cleanStr)) {
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
  const isoMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const [, yr, mo, dy, hr, min, sec] = isoMatch;
    const pad = (n: string | undefined) => (n || '0').padStart(2, '0');
    const isoString = `${yr}-${pad(mo)}-${pad(dy)}T${pad(hr)}:${pad(min)}:${pad(sec)}${tzOffset}`;
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format: "DD/MM/YYYY HH:mm" or "DD-MM-YYYY HH:mm" (UK/India standard)
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

function analyzeIntervalsAndGaps(readings: EnergyReading[]): {
  resolution: DataResolution;
  gaps: CsvGapInfo[];
} {
  if (readings.length < 2) {
    return { resolution: 'hourly', gaps: [] };
  }

  const stepDiffs: number[] = [];
  for (let i = 1; i < Math.min(100, readings.length); i++) {
    const tPrev = new Date(readings[i - 1].timestamp).getTime();
    const tCurr = new Date(readings[i].timestamp).getTime();
    const diffMinutes = Math.round((tCurr - tPrev) / (1000 * 60));
    if (diffMinutes > 0 && diffMinutes <= 1440) {
      stepDiffs.push(diffMinutes);
    }
  }

  stepDiffs.sort((a, b) => a - b);
  const minStep = stepDiffs.length > 0 ? stepDiffs[0] : 60;
  const medianMinutes = stepDiffs.length > 0 ? stepDiffs[Math.floor(stepDiffs.length / 2)] : 60;
  const nominalMinutes = (minStep > 0 && minStep <= 60 && (60 % minStep === 0 || minStep === 1)) ? minStep : medianMinutes;

  let resolution: DataResolution = 'hourly';
  if (nominalMinutes < 1) resolution = 'sub-minute';
  else if (nominalMinutes <= 1) resolution = 'minute';
  else if (nominalMinutes <= 15) resolution = 'quarter-hourly';
  else if (nominalMinutes <= 30) resolution = 'half-hourly';
  else if (nominalMinutes <= 60) resolution = 'hourly';
  else resolution = 'daily';

  // Identify gaps exceeding 1.5x expected interval
  const gaps: CsvGapInfo[] = [];
  const gapThreshold = nominalMinutes * 1.5;

  for (let i = 1; i < readings.length; i++) {
    const tPrev = new Date(readings[i - 1].timestamp).getTime();
    const tCurr = new Date(readings[i].timestamp).getTime();
    const diffMinutes = (tCurr - tPrev) / (1000 * 60);

    if (diffMinutes > gapThreshold) {
      const missingCount = Math.round(diffMinutes / nominalMinutes) - 1;
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
