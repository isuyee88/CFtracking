/**
 * @fileoverview AE to DO Migration Service
 * @description Service for migrating data from Analytics Engine to Durable Objects
 * @module services/migration/ae-to-do.migration
 */

import type { Env } from '@/config/env';

export class AETODOMigrationService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Migrate data from AE to DO
   */
  async migrate(options: {
    startDate?: Date;
    endDate?: Date;
    batchSize?: number;
    dryRun?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    recordsProcessed: number;
    dryRun: boolean;
  }> {
    try {
      // Get TrackingStatsDO instance
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName('global-stats')
      );

      const response = await trackingDO.fetch('http://do/migrate-ae-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || 'Migration completed',
        recordsProcessed: result.recordsProcessed || 0,
        dryRun: options.dryRun || false,
      };
    } catch (error) {
      console.error('[AETODOMigrationService] Error:', error);
      return {
        success: false,
        message: 'Migration failed',
        recordsProcessed: 0,
        dryRun: options.dryRun || false,
      };
    }
  }

  /**
   * Verify migration data consistency
   */
  async verifyMigration(): Promise<{
    success: boolean;
    message: string;
    discrepancies: any[];
  }> {
    try {
      // Get TrackingStatsDO instance
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName('global-stats')
      );

      const response = await trackingDO.fetch('http://do/verify-migration');
      const result = await response.json();

      return {
        success: result.success || false,
        message: result.message || 'Verification completed',
        discrepancies: result.discrepancies || [],
      };
    } catch (error) {
      console.error('[AETODOMigrationService] Verification error:', error);
      return {
        success: false,
        message: 'Verification failed',
        discrepancies: [],
      };
    }
  }
}

export function createAETODOMigrationService(env: Env): AETODOMigrationService {
  return new AETODOMigrationService(env);
}
