/**
 * HearthShift AI — Privacy & Zero-Telemetry Boundary Tests
 * 
 * Verifies that zero household energy readings or bill details
 * trigger network requests or leak to external telemetry endpoints.
 */

import { describe, it, expect, vi } from 'vitest';
import { validateManualBill } from '../../src/core/ingestion/manual-bill';
import { parseEnergyCsv } from '../../src/core/ingestion/csv-parser';
import { evaluateCapabilityState } from '../../src/core/capabilities/policy';
import { TNPDCL_LT1A_2024_2025 } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';

describe('Zero-Telemetry Privacy Boundary Verification', () => {
  it('guarantees zero network fetch requests during full manual bill processing', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const validation = validateManualBill({
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 450,
      total_amount: 1425.0,
      tariff_id: 'in-tnpdcl-lt1a-2024',
    });

    expect(validation.is_valid).toBe(true);
    // Mandatory privacy assertion: Zero fetch calls
    expect(fetchSpy).toHaveBeenCalledTimes(0);

    vi.unstubAllGlobals();
  });

  it('guarantees zero network fetch requests during full interval CSV streaming parse', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const csvContent = `timestamp,kwh
2026-05-01 00:00:00,0.50
2026-05-01 01:00:00,0.42
2026-05-01 02:00:00,0.38
2026-05-01 03:00:00,0.35`;

    const result = await parseEnergyCsv(csvContent);

    expect(result.valid_readings_count).toBe(4);
    // Mandatory privacy assertion: Zero network calls
    expect(fetchSpy).toHaveBeenCalledTimes(0);

    vi.unstubAllGlobals();
  });

  it('guarantees zero network fetch requests during capability policy evaluation', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const evalResult = evaluateCapabilityState({
      bills_count: 5,
      readings_count: 500,
      readings_span_days: 10,
      active_tariff: TNPDCL_LT1A_2024_2025,
    });

    expect(evalResult.mode).toBe('INTERVAL');
    expect(fetchSpy).toHaveBeenCalledTimes(0);

    vi.unstubAllGlobals();
  });
});
