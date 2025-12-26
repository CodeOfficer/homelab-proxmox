import { eq, desc, sql } from 'drizzle-orm';
import { getDatabase } from '../db/client.js';
import { syncLog, syncProgress } from '../db/schema.js';
import type { SyncLog, SyncProgress, SyncStatus, NewSyncLog, NewSyncProgress } from '../types/index.js';

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getDatabase();

  // Get the most recent sync log
  const lastSyncResult = await db
    .select()
    .from(syncLog)
    .orderBy(desc(syncLog.startedAt))
    .limit(1);

  const lastSync = lastSyncResult[0];
  const isRunning = lastSync?.status === 'running';

  // Get current progress if running
  let currentProgress: SyncProgress[] | undefined;
  if (isRunning && lastSync) {
    currentProgress = await db
      .select()
      .from(syncProgress)
      .where(eq(syncProgress.syncLogId, lastSync.id));
  }

  return {
    isRunning,
    lastSync,
    currentProgress,
  };
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(limit = 10): Promise<SyncLog[]> {
  const db = getDatabase();
  return db
    .select()
    .from(syncLog)
    .orderBy(desc(syncLog.startedAt))
    .limit(limit);
}

/**
 * Create a new sync log entry
 */
export async function createSyncLog(data: NewSyncLog): Promise<SyncLog> {
  const db = getDatabase();
  const result = await db.insert(syncLog).values(data).returning();
  return result[0]!;
}

/**
 * Update sync log
 */
export async function updateSyncLog(
  id: number,
  data: Partial<SyncLog>
): Promise<void> {
  const db = getDatabase();
  await db.update(syncLog).set(data).where(eq(syncLog.id, id));
}

/**
 * Create or update sync progress
 */
export async function upsertSyncProgress(data: NewSyncProgress): Promise<void> {
  const db = getDatabase();

  await db
    .insert(syncProgress)
    .values({
      ...data,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      target: [syncProgress.syncLogId, syncProgress.step],
      set: {
        totalItems: data.totalItems,
        processedItems: data.processedItems,
        failedItems: data.failedItems,
        completedAt: data.completedAt,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

/**
 * Get sync progress for a sync log
 */
export async function getSyncProgress(syncLogId: number): Promise<SyncProgress[]> {
  const db = getDatabase();
  return db
    .select()
    .from(syncProgress)
    .where(eq(syncProgress.syncLogId, syncLogId));
}
