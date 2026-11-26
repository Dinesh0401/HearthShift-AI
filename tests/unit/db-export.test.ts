/**
 * HearthShift AI — IndexedDB Full Backup Export Regression Tests
 *
 * Ensures db.exportAllUserData() atomically exports every table in HearthShiftDB
 * and preserves all interval readings (> 100 rows) without sampling/truncation.
 */

import { describe, it, expect, vi } from 'vitest';
import { db } from '../../src/lib/db';

interface StubTable<T> {
  toArray: ReturnType<typeof vi.fn<() => Promise<T[]>>>;
}

function makeTable<T>(rows: T[]): StubTable<T> {
  return {
    toArray: vi.fn(async () => rows),
  };
}

describe('HearthShiftDB exportAllUserData()', () => {
  it('exports all 10 IndexedDB tables and > 100 readings completely without truncation', async () => {
    const mockMeta = [{ key: 'schema_info', value: 'v1', updated_at: '2026-11-26T00:00:00.000Z' }];
    const mockTariffs = [{ id: 'in-tnpdcl-lt1a-may2026', name: 'TNPDCL LT-1A May 2026' }];
    const mockBills = [
      { id: 1, billing_period_start: '2026-01-01', billing_period_end: '2026-02-28', total_units_kwh: 445 },
      { id: 2, billing_period_start: '2026-03-01', billing_period_end: '2026-04-30', total_units_kwh: 492 },
    ];
    const mockReadings = Array.from({ length: 250 }, (_, idx) => ({
      id: idx + 1,
      timestamp: `2026-05-01T${String(idx % 24).padStart(2, '0')}:00:00.000Z`,
      kwh: 0.42 + (idx % 5) * 0.05,
      import_batch_id: 'batch_250',
    }));
    const mockPreferences = [{ id: 1, mu: [1, 1, 1, 1], sigma: [0.4, 0.4, 0.4, 0.3] }];
    const mockRecommendations = [{ id: 'rec_1', outcome: 'recommend', action_id: 'ac_setpoint_plus1' }];
    const mockFeedback = [{ id: 1, recommendation_id: 'rec_1', action_taken: 'tried_it' }];
    const mockSavings = [{ id: 1, recommendation_id: 'rec_1', estimated_paise: 12000 }];
    const mockScenarios = [{ id: 1, baseline_kwh: 512, projected_kwh: 492 }];
    const mockQuestions = [{ id: 1, question_id: 'q_ac_flexibility', response: 1 }];

    const stubDb = {
      meta: makeTable(mockMeta),
      tariffs: makeTable(mockTariffs),
      bills: makeTable(mockBills),
      readings: makeTable(mockReadings),
      preferences: makeTable(mockPreferences),
      recommendations: makeTable(mockRecommendations),
      feedback: makeTable(mockFeedback),
      savings: makeTable(mockSavings),
      scenarios: makeTable(mockScenarios),
      questions: makeTable(mockQuestions),
      transaction: vi.fn(
        async (_mode: string, _tables: unknown[], callback: () => Promise<Record<string, unknown>>) => callback()
      ),
    };

    const exported = await db.exportAllUserData.call(stubDb as unknown as typeof db);

    // Must run inside a single read transaction over all 10 tables for snapshot consistency
    expect(stubDb.transaction).toHaveBeenCalledTimes(1);
    expect(stubDb.transaction.mock.calls[0][0]).toBe('r');
    expect(stubDb.transaction.mock.calls[0][1]).toHaveLength(10);

    expect(exported.app).toBe('HearthShift AI');
    expect(exported.export_schema_version).toBe(2);
    expect(typeof exported.exported_at).toBe('string');
    expect(exported).not.toHaveProperty('readings_sample');

    expect(exported.meta).toEqual(mockMeta);
    expect(exported.tariffs).toEqual(mockTariffs);
    expect(exported.bills_count).toBe(2);
    expect(exported.bills).toEqual(mockBills);
    expect(exported.readings_count).toBe(250);
    expect(exported.readings).toHaveLength(250);
    expect(exported.readings).toEqual(mockReadings);
    expect(exported.preferences).toEqual(mockPreferences);
    expect(exported.recommendations).toEqual(mockRecommendations);
    expect(exported.feedback).toEqual(mockFeedback);
    expect(exported.savings).toEqual(mockSavings);
    expect(exported.scenarios).toEqual(mockScenarios);
    expect(exported.questions).toEqual(mockQuestions);
  });
});
