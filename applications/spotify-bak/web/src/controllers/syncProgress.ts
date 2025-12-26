import { Request, Response } from 'express';
import { getDatabase } from '@homelab/spotify-shared';

/**
 * Get current sync progress (polling endpoint for dashboard)
 *
 * Returns real-time progress data if a sync is running:
 * - Overall progress percentage
 * - Elapsed time and ETA
 * - Step-by-step breakdown (playlists, artists, audio_features)
 *
 * Returns { running: false } if no sync is active
 *
 * Dashboard polls this endpoint every 2 seconds during sync
 */
export async function getSyncProgress(req: Request, res: Response) {
  try {
    const db = getDatabase();

    // Get latest running sync with progress steps
    const latestSync = db.getLatestRunningSyncWithProgress();

    if (!latestSync) {
      return res.json({
        running: false,
        message: 'No sync currently running'
      });
    }

    // Calculate overall progress
    const steps = (latestSync as any).steps || [];
    const totalItems = steps.reduce((sum: number, s: any) => sum + (s.total_items || 0), 0);
    const processedItems = steps.reduce((sum: number, s: any) => sum + (s.processed_items || 0), 0);
    const failedItems = steps.reduce((sum: number, s: any) => sum + (s.failed_items || 0), 0);

    const progressPercent = totalItems > 0 ? Math.floor((processedItems / totalItems) * 100) : 0;

    // Calculate elapsed time
    const startTime = new Date((latestSync as any).started_at).getTime();
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);

    // Calculate ETA
    let etaSeconds: number | null = null;
    if (processedItems > 0 && elapsed > 0) {
      const rate = processedItems / (elapsed / 1000); // items per second
      const remaining = totalItems - processedItems;
      etaSeconds = rate > 0 ? Math.ceil(remaining / rate) : null;
    }

    // Check for timeout (sync running > 1 hour = K8s Job TTL)
    const timeoutWarning = elapsedSeconds > 3600;

    // Format step details
    const stepsFormatted = steps.map((step: any) => ({
      step: step.step,
      total_items: step.total_items || 0,
      processed_items: step.processed_items || 0,
      failed_items: step.failed_items || 0,
      progress_percent: step.total_items > 0
        ? Math.floor(((step.processed_items || 0) / step.total_items) * 100)
        : 0,
      completed: !!step.completed_at,
      started_at: step.started_at
    }));

    res.json({
      running: true,
      sync_log_id: (latestSync as any).id,
      sync_type: (latestSync as any).sync_type,
      progress_percent: progressPercent,
      total_items: totalItems,
      processed_items: processedItems,
      failed_items: failedItems,
      elapsed_seconds: elapsedSeconds,
      eta_seconds: etaSeconds,
      estimated_completion_at: (latestSync as any).estimated_completion_at || null,
      timeout_warning: timeoutWarning,
      steps: stepsFormatted
    });

  } catch (error: any) {
    console.error('Error fetching sync progress:', error);
    res.status(500).json({
      running: false,
      error: 'Failed to fetch sync progress',
      message: error.message
    });
  }
}
