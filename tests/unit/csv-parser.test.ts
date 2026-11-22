/**
 * HearthShift AI — Streaming CSV Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseEnergyCsv } from '../../src/core/ingestion/csv-parser';

describe('Streaming CSV Parser', () => {
  it('parses standard 2-column interval CSV data (timestamp, kwh)', async () => {
    const csvContent = `timestamp,consumption_kwh
2026-05-01 00:00:00,0.45
2026-05-01 01:00:00,0.38
2026-05-01 02:00:00,0.32
2026-05-01 03:00:00,0.30`;

    const result = await parseEnergyCsv(csvContent);

    expect(result.valid_readings_count).toBe(4);
    expect(result.error_count).toBe(0);
    expect(result.detected_resolution).toBe('hourly');
    expect(result.total_consumption_kwh).toBeCloseTo(1.45, 2);
    expect(result.readings[0].value_kwh).toBe(0.45);
  });

  it('parses Low Carbon London format (LCLid,stdorHour,DateTime,KWH/hh)', async () => {
    const lclCsv = `LCLid,stdorHour,DateTime,KWH/hh (per half hour)
MAC000002,Std,2012-10-12 00:30:00.0000000,0.138
MAC000002,Std,2012-10-12 01:00:00.0000000,0.125
MAC000002,Std,2012-10-12 01:30:00.0000000,0.110`;

    const result = await parseEnergyCsv(lclCsv);

    expect(result.valid_readings_count).toBe(3);
    expect(result.detected_resolution).toBe('half-hourly');
    expect(result.total_consumption_kwh).toBeCloseTo(0.373, 3);
  });

  it('sorts out-of-order interval records chronologically', async () => {
    const outOfOrderCsv = `timestamp,kwh
2026-05-01 03:00:00,0.30
2026-05-01 01:00:00,0.38
2026-05-01 00:00:00,0.45
2026-05-01 02:00:00,0.32`;

    const result = await parseEnergyCsv(outOfOrderCsv);

    expect(result.valid_readings_count).toBe(4);
    // Verified sorted in chronological ascending order
    const t0 = new Date(result.readings[0].timestamp).getTime();
    const t1 = new Date(result.readings[1].timestamp).getTime();
    const t2 = new Date(result.readings[2].timestamp).getTime();
    const t3 = new Date(result.readings[3].timestamp).getTime();
    expect(t0).toBeLessThan(t1);
    expect(t1).toBeLessThan(t2);
    expect(t2).toBeLessThan(t3);
    expect(result.readings[0].value_kwh).toBe(0.45); // 00:00 row
    expect(result.readings[1].value_kwh).toBe(0.38); // 01:00 row
    expect(result.readings[2].value_kwh).toBe(0.32); // 02:00 row
    expect(result.readings[3].value_kwh).toBe(0.30); // 03:00 row
  });

  it('detects and removes duplicate timestamps without crashing', async () => {
    const duplicateCsv = `timestamp,kwh
2026-05-01 00:00:00,0.45
2026-05-01 00:00:00,0.45
2026-05-01 01:00:00,0.38`;

    const result = await parseEnergyCsv(duplicateCsv);

    expect(result.valid_readings_count).toBe(2);
    expect(result.duplicate_count).toBe(1);
    expect(result.warnings.some((w) => w.includes('duplicate timestamp'))).toBe(true);
  });

  it('handles cumulative meter readings and calculates interval deltas with reset detection', async () => {
    const cumulativeCsv = `timestamp,meter_reading
2026-05-01 00:00:00,10500.0
2026-05-01 01:00:00,10501.2
2026-05-01 02:00:00,10502.6
2026-05-01 03:00:00,10503.5
2026-05-01 04:00:00,5.0`; // Meter reset to 5.0!

    const result = await parseEnergyCsv(cumulativeCsv, {
      mapping: { is_cumulative_meter: true },
    });

    expect(result.is_cumulative_detected).toBe(true);
    // Interval deltas:
    // 10501.2 - 10500.0 = 1.2 kWh
    // 10502.6 - 10501.2 = 1.4 kWh
    // 10503.5 - 10502.6 = 0.9 kWh
    // Reset boundary: delta = 5.0 kWh
    expect(result.valid_readings_count).toBe(4);
    expect(result.readings[0].value_kwh).toBe(1.2);
    expect(result.readings[1].value_kwh).toBe(1.4);
    expect(result.readings[2].value_kwh).toBe(0.9);
    expect(result.warnings.some((w) => w.includes('Meter reset or rollover'))).toBe(true);
  });

  it('identifies missing interval gaps without fabricating synthetic data', async () => {
    const gapCsv = `timestamp,kwh
2026-05-01 00:00:00,0.50
2026-05-01 01:00:00,0.50
2026-05-01 05:00:00,0.50`; // 4-hour gap!

    const result = await parseEnergyCsv(gapCsv);

    expect(result.valid_readings_count).toBe(3); // Exactly 3 rows, ZERO invented
    expect(result.gaps.length).toBe(1);
    expect(result.gaps[0].missing_duration_minutes).toBe(240); // 4 hours
    expect(result.gaps[0].estimated_missing_intervals).toBe(3);
    expect(result.warnings.some((w) => w.includes('missing interval gaps'))).toBe(true);
  });

  it('rejects negative consumption values in interval mode', async () => {
    const negativeCsv = `timestamp,kwh
2026-05-01 00:00:00,0.50
2026-05-01 01:00:00,-2.30
2026-05-01 02:00:00,0.40`;

    const result = await parseEnergyCsv(negativeCsv);

    expect(result.valid_readings_count).toBe(2);
    expect(result.error_count).toBe(1);
    expect(result.errors[0].error).toContain('Negative consumption rejected');
  });

  it('parses REFIT format (aggregate in Watts) and integrates to kWh via trapezoidal rule', async () => {
    const refitCsv = `Time,Unix,Aggregate
2014-04-01 00:00:00,1396310400,1200
2014-04-01 00:00:08,1396310408,1200
2014-04-01 00:00:16,1396310416,1400`;

    const result = await parseEnergyCsv(refitCsv);

    expect(result.valid_readings_count).toBe(2);
    expect(result.measurement_kind).toBe('instantaneous_power_w');
    expect(result.source_unit).toContain('W');
    // Interval 1: 8s at 1200W -> (1200 * 8) / 3600000 = 0.00267 kWh
    // Interval 2: 8s at avg(1200, 1400)=1300W -> (1300 * 8) / 3600000 = 0.00289 kWh
    expect(result.readings[0].value_kwh).toBeCloseTo(0.00267, 5);
    expect(result.readings[1].value_kwh).toBeCloseTo(0.00289, 5);
    expect(result.total_consumption_kwh).toBeCloseTo(0.00556, 4);
    expect(result.warnings.some((w) => w.includes('trapezoidal numerical integration'))).toBe(true);
  });

  it('correctly calculates delta across meter rollover when known modulus is provided', async () => {
    const rolloverCsv = `timestamp,meter_reading
2026-05-01 00:00:00,99998.0
2026-05-01 01:00:00,2.0`;

    const result = await parseEnergyCsv(rolloverCsv, {
      mapping: {
        is_cumulative_meter: true,
        rollover_modulus_kwh: 100000,
      },
    });

    expect(result.valid_readings_count).toBe(1);
    // Rollover delta = 2.0 + 100000 - 99998.0 = 4.0 kWh
    expect(result.readings[0].value_kwh).toBe(4.0);
    expect(result.total_consumption_kwh).toBe(4.0);
    expect(result.warnings.some((w) => w.includes('Meter rollover detected'))).toBe(true);
  });

  it('correctly integrates nominal 15-minute power samples without rejecting intervals as gaps', async () => {
    const power15mCsv = `timestamp,active_power_w
2026-05-01 00:00:00,1000
2026-05-01 00:15:00,1000
2026-05-01 00:30:00,2000`;

    const result = await parseEnergyCsv(power15mCsv);

    expect(result.valid_readings_count).toBe(2);
    expect(result.measurement_kind).toBe('instantaneous_power_w');
    // Interval 1: 15 min (900s) at 1000W -> (1000 * 900) / 3,600,000 = 0.25 kWh
    expect(result.readings[0].value_kwh).toBeCloseTo(0.25, 3);
    // Interval 2: 15 min (900s) at avg(1000, 2000)=1500W -> (1500 * 900) / 3,600,000 = 0.375 kWh
    expect(result.readings[1].value_kwh).toBeCloseTo(0.375, 3);
    expect(result.total_consumption_kwh).toBeCloseTo(0.625, 3);
    expect(result.readings[0].resolution).toBe('quarter-hourly');
  });

  it('omits trapezoidal integration across unexplained gaps in 15-minute power data', async () => {
    const powerGapCsv = `timestamp,active_power_w
2026-05-01 00:00:00,1000
2026-05-01 00:15:00,1000
2026-05-01 04:15:00,1000`; // 4-hour gap!

    const result = await parseEnergyCsv(powerGapCsv);

    // Only 1 valid continuous interval (00:00 to 00:15), gap from 00:15 to 04:15 is omitted!
    expect(result.valid_readings_count).toBe(1);
    expect(result.readings[0].value_kwh).toBeCloseTo(0.25, 3);
    expect(result.total_consumption_kwh).toBeCloseTo(0.25, 3);
    expect(result.warnings.some((w) => w.includes('exceeds nominal threshold'))).toBe(true);
  });

  it('aborts parsing when AbortSignal is triggered', async () => {
    const largeCsv = Array.from(
      { length: 500 },
      (_, i) => `2026-05-01 ${String(i % 24).padStart(2, '0')}:00:00,0.5`
    ).join('\n');

    const csvContent = `timestamp,kwh\n${largeCsv}`;
    const controller = new AbortController();
    controller.abort(); // Pre-abort

    await expect(
      parseEnergyCsv(csvContent, { abort_signal: controller.signal })
    ).rejects.toThrow('cancelled');
  });
});
