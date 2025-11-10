/**
 * Team Dashboard Repository
 * 
 * Repository implementation for managing team dashboard metrics, analytics, and activity feeds.
 * Provides data access methods for dashboard data aggregation and team performance metrics.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import {
  ITeamDashboardRepository,
  TeamDashboardMetric,
  TeamActivity,
  TeamDashboardData,
  PaginationOptions,
  ILogger,
  DatabaseError
} from '../interfaces';

export class TeamDashboardRepository implements ITeamDashboardRepository {
  private db: Pool;
  private logger: ILogger;

  constructor(db: Pool, logger: ILogger) {
    this.db = db;
    this.logger = logger;
  }

  async getOrganizationStats(
    organizationId: string, 
    periodDays: number
  ): Promise<TeamDashboardData['organizationStats']> {
    try {
      // Calculate period start date
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const query = `
        WITH organization_data AS (
          SELECT 
            -- Total QR codes (would need integration with QR service)
            0 as total_qr_codes,
            -- Total libraries
            COALESCE((SELECT COUNT(*) FROM qr_libraries WHERE organization_id = $1 AND is_active = true), 0) as total_libraries,
            -- Active members
            COALESCE((SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND status = 'active'), 0) as active_members,
            -- Shared QR codes (would need QR service integration)
            0 as shared_qr_codes
        ),
        scan_data AS (
          SELECT
            -- Total scans (would need analytics service integration)
            0 as total_scans,
            -- Scans this period (would need analytics service integration) 
            0 as scans_this_period
        )
        SELECT 
          od.total_qr_codes,
          od.total_libraries, 
          sd.total_scans,
          sd.scans_this_period,
          od.active_members,
          od.shared_qr_codes
        FROM organization_data od, scan_data sd
      `;

      const result = await this.db.query(query, [organizationId]);
      const row = result.rows[0];

      const stats = {
        totalQrCodes: parseInt(row.total_qr_codes, 10),
        totalLibraries: parseInt(row.total_libraries, 10),
        totalScans: parseInt(row.total_scans, 10),
        scansThisPeriod: parseInt(row.scans_this_period, 10),
        activeMembers: parseInt(row.active_members, 10),
        sharedQrCodes: parseInt(row.shared_qr_codes, 10)
      };

      this.logger.debug('Retrieved organization stats', {
        organizationId,
        periodDays,
        stats
      });

      return stats;

    } catch (error) {
      this.logger.error('Failed to get organization stats', {
        organizationId,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve organization stats');
    }
  }

  async getTeamMetrics(
    organizationId: string, 
    metricTypes: string[], 
    periodDays: number
  ): Promise<TeamDashboardMetric[]> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      let query = `
        SELECT * FROM team_dashboard_metrics 
        WHERE organization_id = $1 
          AND period_start >= $2
      `;
      let params: any[] = [organizationId, periodStart];

      if (metricTypes.length > 0) {
        query += ' AND metric_type = ANY($3)';
        params.push(metricTypes);
      }

      query += ' ORDER BY calculated_at DESC';

      const result = await this.db.query(query, params);
      const metrics = result.rows.map(row => this.mapRowToMetric(row));

      this.logger.debug('Retrieved team metrics', {
        organizationId,
        metricTypes,
        periodDays,
        count: metrics.length
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get team metrics', {
        organizationId,
        metricTypes,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve team metrics');
    }
  }

  async getRecentActivity(
    organizationId: string, 
    pagination: PaginationOptions
  ): Promise<{ activities: TeamActivity[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM team_activity_feed WHERE organization_id = $1';
      const countResult = await this.db.query(countQuery, [organizationId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get activities
      const dataQuery = `
        SELECT * FROM team_activity_feed 
        WHERE organization_id = $1 
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const dataResult = await this.db.query(dataQuery, [organizationId, pagination.limit, offset]);

      const activities = dataResult.rows.map(row => this.mapRowToActivity(row));

      this.logger.debug('Retrieved recent activity', {
        organizationId,
        count: activities.length,
        total,
        page: pagination.page,
        limit: pagination.limit
      });

      return { activities, total };

    } catch (error) {
      this.logger.error('Failed to get recent activity', {
        organizationId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve recent activity');
    }
  }

  async getTopPerformingQRs(
    organizationId: string, 
    limit: number, 
    periodDays: number
  ): Promise<TeamDashboardData['topPerformingQRs']> {
    try {
      // TODO: This would require integration with QR service and analytics service
      // For now, return empty array as placeholder
      
      const topQRs: TeamDashboardData['topPerformingQRs'] = [];

      this.logger.debug('Retrieved top performing QRs', {
        organizationId,
        limit,
        periodDays,
        count: topQRs.length
      });

      return topQRs;

    } catch (error) {
      this.logger.error('Failed to get top performing QRs', {
        organizationId,
        limit,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve top performing QRs');
    }
  }

  async getMemberActivity(
    organizationId: string, 
    periodDays: number
  ): Promise<TeamDashboardData['memberActivity']> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const query = `
        SELECT 
          taf.user_id,
          'Unknown User' as user_name, -- TODO: Join with user service
          COUNT(*) as action_count,
          MAX(taf.created_at) as last_activity
        FROM team_activity_feed taf
        WHERE taf.organization_id = $1 
          AND taf.created_at >= $2
        GROUP BY taf.user_id
        ORDER BY action_count DESC, last_activity DESC
        LIMIT 10
      `;

      const result = await this.db.query(query, [organizationId, periodStart]);

      const memberActivity = result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        actionCount: parseInt(row.action_count, 10),
        lastActivity: new Date(row.last_activity)
      }));

      this.logger.debug('Retrieved member activity', {
        organizationId,
        periodDays,
        count: memberActivity.length
      });

      return memberActivity;

    } catch (error) {
      this.logger.error('Failed to get member activity', {
        organizationId,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve member activity');
    }
  }

  async createMetric(data: {
    organizationId: string;
    metricType: string;
    metricName: string;
    metricValue: number;
    metricData?: Record<string, any>;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<TeamDashboardMetric> {
    try {
      const query = `
        INSERT INTO team_dashboard_metrics (
          organization_id, metric_type, metric_name, metric_value, 
          metric_data, period_start, period_end, calculated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

      const result = await this.db.query(query, [
        data.organizationId,
        data.metricType,
        data.metricName,
        data.metricValue,
        data.metricData ? JSON.stringify(data.metricData) : null,
        data.periodStart,
        data.periodEnd
      ]);

      const metric = this.mapRowToMetric(result.rows[0]);

      this.logger.info('Team metric created', {
        metricId: metric.id,
        organizationId: data.organizationId,
        metricType: data.metricType,
        metricName: data.metricName
      });

      return metric;

    } catch (error) {
      this.logger.error('Failed to create team metric', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to create team metric');
    }
  }

  async logActivity(data: {
    organizationId: string;
    userId: string;
    activityType: string;
    resourceType?: string;
    resourceId?: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<TeamActivity> {
    try {
      const query = `
        INSERT INTO team_activity_feed (
          organization_id, user_id, activity_type, resource_type, 
          resource_id, description, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

      const result = await this.db.query(query, [
        data.organizationId,
        data.userId,
        data.activityType,
        data.resourceType || null,
        data.resourceId || null,
        data.description,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);

      const activity = this.mapRowToActivity(result.rows[0]);

      this.logger.debug('Team activity logged', {
        activityId: activity.id,
        organizationId: data.organizationId,
        userId: data.userId,
        activityType: data.activityType
      });

      return activity;

    } catch (error) {
      this.logger.error('Failed to log team activity', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to log team activity');
    }
  }

  async getMetricHistory(
    organizationId: string, 
    metricType: string, 
    periodDays: number
  ): Promise<TeamDashboardMetric[]> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      const query = `
        SELECT * FROM team_dashboard_metrics 
        WHERE organization_id = $1 
          AND metric_type = $2 
          AND period_start >= $3
        ORDER BY period_start ASC
      `;

      const result = await this.db.query(query, [organizationId, metricType, periodStart]);
      const metrics = result.rows.map(row => this.mapRowToMetric(row));

      this.logger.debug('Retrieved metric history', {
        organizationId,
        metricType,
        periodDays,
        count: metrics.length
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get metric history', {
        organizationId,
        metricType,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve metric history');
    }
  }

  async cleanupOldMetrics(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = 'DELETE FROM team_dashboard_metrics WHERE calculated_at < $1';
      const result = await this.db.query(query, [cutoffDate]);

      const deletedCount = result.rowCount || 0;

      this.logger.info('Cleaned up old dashboard metrics', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup old metrics', {
        retentionDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to cleanup old metrics');
    }
  }

  async cleanupOldActivity(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = 'DELETE FROM team_activity_feed WHERE created_at < $1';
      const result = await this.db.query(query, [cutoffDate]);

      const deletedCount = result.rowCount || 0;

      this.logger.info('Cleaned up old team activity', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup old activity', {
        retentionDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to cleanup old activity');
    }
  }

  private mapRowToMetric(row: any): TeamDashboardMetric {
    return {
      id: row.id,
      organizationId: row.organization_id,
      metricType: row.metric_type,
      metricName: row.metric_name,
      metricValue: parseFloat(row.metric_value),
      metricData: row.metric_data ? JSON.parse(row.metric_data) : {},
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      calculatedAt: new Date(row.calculated_at)
    };
  }

  private mapRowToActivity(row: any): TeamActivity {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      activityType: row.activity_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at)
    };
  }
}