/**
 * HearthShift AI — Privacy-Preserving Storage Operations
 * 
 * Manages atomic, transactional persistence of interval energy readings into IndexedDB.
 * Enforces local-only processing, batch tracking, rollback capability, and zero network transmission.
 * 
 * @module core/storage/ingestion-storage
 */

import { db, type StoredEnergyReading } from '../../lib/db';
import type { EnergyReading } from '../../types/contracts';

export interface BatchCommitResult {
  import_batch_id: string;
  records_committed: number;
  committed_at: string;
  resolution: string;
}

/**
 * Persists an array of validated EnergyReadings into IndexedDB with batch tracking.
 * Executes in chunked transactions to avoid long write locks.
 */
export async function commitValidatedReadings(
  readings: EnergyReading[],
  _fileName?: string
): Promise<BatchCommitResult> {
  if (readings.length === 0) {
    throw new Error('Cannot commit empty readings array.');
  }

  const importBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const chunkSize = 2500;

  for (let i = 0; i < readings.length; i += chunkSize) {
    const chunk = readings.slice(i, i + chunkSize);
    const storedChunk: StoredEnergyReading[] = chunk.map((r) => ({
      ...r,
      import_batch_id: importBatchId,
      created_at: now,
    }));

    await db.transaction('rw', db.readings, async () => {
      await db.readings.bulkAdd(storedChunk);
    });
  }

  return {
    import_batch_id: importBatchId,
    records_committed: readings.length,
    committed_at: now,
    resolution: readings[0].resolution,
  };
}

/**
 * Rolls back (permanently deletes) a specific CSV import batch from IndexedDB.
 */
export async function rollbackImportBatch(batchId: string): Promise<number> {
  const matching = await db.readings.where('import_batch_id').equals(batchId).toArray();
  const ids = matching.map((r) => r.id!).filter((id): id is number => id !== undefined);

  if (ids.length > 0) {
    await db.readings.bulkDelete(ids);
  }

  return ids.length;
}

export { rollbackImportBatch as rollbackBatch };

/**
 * Retrieves total count of stored interval readings.
 */
export async function getTotalReadingCount(): Promise<number> {
  return db.readings.count();
}

/**
 * Retrieves chronological date bounds of stored interval readings.
 */
export async function getReadingsDateBounds(): Promise<{
  start?: string;
  end?: string;
  count: number;
  spanDays: number;
}> {
  const count = await db.readings.count();
  if (count === 0) {
    return { count: 0, spanDays: 0 };
  }

  const first = await db.readings.orderBy('timestamp').first();
  const last = await db.readings.orderBy('timestamp').reverse().first();

  if (!first || !last) {
    return { count, spanDays: 0 };
  }

  const spanDays = Math.max(
    0,
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    start: first.timestamp,
    end: last.timestamp,
    count,
    spanDays: Math.round(spanDays * 10) / 10,
  };
}

/**
 * Purges all interval readings permanently while preserving user preferences and bills.
 */
export async function clearAllReadings(): Promise<void> {
  await db.readings.clear();
}
