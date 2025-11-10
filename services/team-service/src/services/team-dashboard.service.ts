/**
 * Team Dashboard Service
 * 
 * Business logic service for team dashboard functionality.
 * Aggregates team metrics, activity feeds, and performance analytics
 * to provide comprehensive team collaboration insights.
 * 
 * @author AI Agent
 * @date 2024
 */

import {
  ITeamDashboardRepository,
  IMemberRepository,
  ILogger,
  TeamDashboardData,
  TeamDashboardRequest,
  TeamActivity,
  TeamDashboardMetric,
  PaginationOptions,
  ServiceResponse,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '../interfaces';

export class TeamDashboardService {
  private dashboardRepo: ITeamDashboardRepository;
  private memberRepo: IMemberRepository;
  private logger: ILogger;

  constructor(
    dashboardRepo: ITeamDashboardRepository,
    memberRepo: IMemberRepository,
    logger: ILogger
  ) {
    this.dashboardRepo = dashboardRepo;
    this.memberRepo = memberRepo;
    this.logger = logger;
  }

  async getTeamDashboard(
    organizationId: string, 
    userId: string, 
    request: TeamDashboardRequest
  ): Promise<ServiceResponse<TeamDashboardData>> {
    try {
      // Check if user is a member of the organization
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Validate request parameters
      const periodDays = this.validateAndGetPeriodDays(request.periodDays);
      const metricTypes = request.metricTypes || [];

      // Fetch all dashboard data in parallel
      const [
        organizationStats,
        metrics,
        recentActivity,
        topPerformingQRs,
        memberActivity
      ] = await Promise.all([
        this.dashboardRepo.getOrganizationStats(organizationId, periodDays),
        this.dashboardRepo.getTeamMetrics(organizationId, metricTypes, periodDays),
        request.includeActivity !== false 
          ? this.dashboardRepo.getRecentActivity(organizationId, { page: 1, limit: 10 })
          : Promise.resolve({ activities: [], total: 0 }),
        this.dashboardRepo.getTopPerformingQRs(organizationId, 5, periodDays),
        this.dashboardRepo.getMemberActivity(organizationId, periodDays)
      ]);

      const dashboardData: TeamDashboardData = {
        organizationStats,
        metrics,
        recentActivity: recentActivity.activities,
        topPerformingQRs,
        memberActivity
      };

      this.logger.info('Team dashboard data retrieved', {
        organizationId,
        userId,
        periodDays,
        metricsCount: metrics.length,
        activitiesCount: recentActivity.activities.length
      });

      return { success: true, data: dashboardData };

    } catch (error) {
      this.logger.error('Failed to get team dashboard', {
        organizationId,
        userId,
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to retrieve team dashboard', 500, 'INTERNAL_ERROR');
    }
  }

  async getTeamActivity(
    organizationId: string, 
    userId: string, 
    pagination: PaginationOptions
  ): Promise<ServiceResponse<TeamActivity[]>> {
    try {
      // Check if user is a member of the organization
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Get team activity with pagination
      const result = await this.dashboardRepo.getRecentActivity(organizationId, pagination);

      this.logger.debug('Team activity retrieved', {
        organizationId,
        userId,
        count: result.activities.length,
        total: result.total,
        page: pagination.page
      });

      return {
        success: true,
        data: result.activities,
        meta: {
          total: result.total,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / pagination.limit)
          }
        }
      };

    } catch (error) {
      this.logger.error('Failed to get team activity', {
        organizationId,
        userId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to retrieve team activity', 500, 'INTERNAL_ERROR');
    }
  }

  async getMetricHistory(
    organizationId: string, 
    userId: string, 
    metricType: string, 
    periodDays: number = 30
  ): Promise<ServiceResponse<TeamDashboardMetric[]>> {
    try {
      // Check if user is a member of the organization
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Validate inputs
      if (!metricType?.trim()) {
        throw new ValidationError('Metric type is required');
      }

      const validatedPeriodDays = this.validateAndGetPeriodDays(periodDays);

      // Get metric history
      const metrics = await this.dashboardRepo.getMetricHistory(
        organizationId, 
        metricType.trim(), 
        validatedPeriodDays
      );

      this.logger.debug('Metric history retrieved', {
        organizationId,
        userId,
        metricType,
        periodDays: validatedPeriodDays,
        count: metrics.length
      });

      return { success: true, data: metrics };

    } catch (error) {
      this.logger.error('Failed to get metric history', {
        organizationId,
        userId,
        metricType,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to retrieve metric history', 500, 'INTERNAL_ERROR');
    }
  }

  async logTeamActivity(
    organizationId: string,
    userId: string,
    activityType: string,
    description: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      // Validate inputs
      if (!activityType?.trim()) {
        throw new ValidationError('Activity type is required');
      }

      if (!description?.trim()) {
        throw new ValidationError('Description is required');
      }

      // Log the activity
      const activityData = {
        organizationId,
        userId,
        activityType: activityType.trim(),
        description: description.trim(),
        ...(options.resourceType?.trim() && { resourceType: options.resourceType.trim() }),
        ...(options.resourceId?.trim() && { resourceId: options.resourceId.trim() }),
        ...(options.metadata && { metadata: options.metadata })
      };

      const activity = await this.dashboardRepo.logActivity(activityData);

      this.logger.debug('Team activity logged', {
        organizationId,
        userId,
        activityType,
        activityId: activity.id
      });

    } catch (error) {
      this.logger.error('Failed to log team activity', {
        organizationId,
        userId,
        activityType,
        description,
        options,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw error for activity logging to avoid breaking main flow
      // Just log the error
    }
  }

  async createCustomMetric(
    organizationId: string,
    userId: string,
    metricData: {
      metricType: string;
      metricName: string;
      metricValue: number;
      metricData?: Record<string, any>;
      periodStart: Date;
      periodEnd: Date;
    }
  ): Promise<ServiceResponse<TeamDashboardMetric>> {
    try {
      // Check if user is a member with appropriate permissions
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Only admin and owner can create custom metrics
      if (!['admin', 'owner'].includes(member.role)) {
        throw new UnauthorizedError('Insufficient permissions to create custom metrics');
      }

      // Validate metric data
      this.validateMetricData(metricData);

      // Create the metric
      const metric = await this.dashboardRepo.createMetric({
        organizationId,
        ...metricData
      });

      this.logger.info('Custom metric created', {
        organizationId,
        userId,
        metricId: metric.id,
        metricType: metricData.metricType,
        metricName: metricData.metricName
      });

      return { success: true, data: metric };

    } catch (error) {
      this.logger.error('Failed to create custom metric', {
        organizationId,
        userId,
        metricData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to create custom metric', 500, 'INTERNAL_ERROR');
    }
  }

  async getDashboardSummary(
    organizationId: string, 
    userId: string
  ): Promise<ServiceResponse<{
    totalQrCodes: number;
    totalLibraries: number;
    activeMembers: number;
    recentActivitiesCount: number;
    topMetrics: TeamDashboardMetric[];
  }>> {
    try {
      // Check if user is a member of the organization
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Get summary data
      const [organizationStats, recentActivity, topMetrics] = await Promise.all([
        this.dashboardRepo.getOrganizationStats(organizationId, 7), // Last 7 days
        this.dashboardRepo.getRecentActivity(organizationId, { page: 1, limit: 1 }),
        this.dashboardRepo.getTeamMetrics(organizationId, [], 7)
      ]);

      const summary = {
        totalQrCodes: organizationStats.totalQrCodes,
        totalLibraries: organizationStats.totalLibraries,
        activeMembers: organizationStats.activeMembers,
        recentActivitiesCount: recentActivity.total,
        topMetrics: topMetrics.slice(0, 3) // Top 3 metrics
      };

      this.logger.debug('Dashboard summary retrieved', {
        organizationId,
        userId,
        summary
      });

      return { success: true, data: summary };

    } catch (error) {
      this.logger.error('Failed to get dashboard summary', {
        organizationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to retrieve dashboard summary', 500, 'INTERNAL_ERROR');
    }
  }

  // Maintenance and cleanup methods

  async cleanupOldData(
    retentionDays: number = 90
  ): Promise<{ metricsDeleted: number; activitiesDeleted: number }> {
    try {
      this.logger.info('Starting dashboard data cleanup', { retentionDays });

      const [metricsDeleted, activitiesDeleted] = await Promise.all([
        this.dashboardRepo.cleanupOldMetrics(retentionDays),
        this.dashboardRepo.cleanupOldActivity(retentionDays)
      ]);

      this.logger.info('Dashboard data cleanup completed', {
        retentionDays,
        metricsDeleted,
        activitiesDeleted
      });

      return { metricsDeleted, activitiesDeleted };

    } catch (error) {
      this.logger.error('Failed to cleanup dashboard data', {
        retentionDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to cleanup dashboard data', 500, 'INTERNAL_ERROR');
    }
  }

  async generatePerformanceReport(
    organizationId: string,
    userId: string,
    periodDays: number = 30
  ): Promise<ServiceResponse<{
    organizationStats: TeamDashboardData['organizationStats'];
    metrics: TeamDashboardMetric[];
    topPerformingQRs: TeamDashboardData['topPerformingQRs'];
    memberActivity: TeamDashboardData['memberActivity'];
    generatedAt: Date;
    periodDays: number;
  }>> {
    try {
      // Check if user is a member with appropriate permissions
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        throw new UnauthorizedError('Access denied to this organization');
      }

      // Only admin and owner can generate reports
      if (!['admin', 'owner'].includes(member.role)) {
        throw new UnauthorizedError('Insufficient permissions to generate reports');
      }

      const validatedPeriodDays = this.validateAndGetPeriodDays(periodDays);

      // Generate comprehensive performance report
      const [organizationStats, metrics, topPerformingQRs, memberActivity] = await Promise.all([
        this.dashboardRepo.getOrganizationStats(organizationId, validatedPeriodDays),
        this.dashboardRepo.getTeamMetrics(organizationId, [], validatedPeriodDays),
        this.dashboardRepo.getTopPerformingQRs(organizationId, 10, validatedPeriodDays),
        this.dashboardRepo.getMemberActivity(organizationId, validatedPeriodDays)
      ]);

      const report = {
        organizationStats,
        metrics,
        topPerformingQRs,
        memberActivity,
        generatedAt: new Date(),
        periodDays: validatedPeriodDays
      };

      this.logger.info('Performance report generated', {
        organizationId,
        userId,
        periodDays: validatedPeriodDays,
        metricsCount: metrics.length,
        topQRsCount: topPerformingQRs.length
      });

      return { success: true, data: report };

    } catch (error) {
      this.logger.error('Failed to generate performance report', {
        organizationId,
        userId,
        periodDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to generate performance report', 500, 'INTERNAL_ERROR');
    }
  }

  // Private helper methods

  private validateAndGetPeriodDays(periodDays?: number): number {
    if (periodDays === undefined || periodDays === null) {
      return 30; // Default to 30 days
    }

    if (!Number.isInteger(periodDays) || periodDays < 1) {
      throw new ValidationError('Period days must be a positive integer');
    }

    if (periodDays > 365) {
      throw new ValidationError('Period days cannot exceed 365');
    }

    return periodDays;
  }

  private validateMetricData(metricData: {
    metricType: string;
    metricName: string;
    metricValue: number;
    periodStart: Date;
    periodEnd: Date;
  }): void {
    if (!metricData.metricType?.trim()) {
      throw new ValidationError('Metric type is required');
    }

    if (!metricData.metricName?.trim()) {
      throw new ValidationError('Metric name is required');
    }

    if (typeof metricData.metricValue !== 'number' || !Number.isFinite(metricData.metricValue)) {
      throw new ValidationError('Metric value must be a valid number');
    }

    if (!(metricData.periodStart instanceof Date) || isNaN(metricData.periodStart.getTime())) {
      throw new ValidationError('Period start must be a valid date');
    }

    if (!(metricData.periodEnd instanceof Date) || isNaN(metricData.periodEnd.getTime())) {
      throw new ValidationError('Period end must be a valid date');
    }

    if (metricData.periodEnd <= metricData.periodStart) {
      throw new ValidationError('Period end must be after period start');
    }

    // Validate metric type format
    if (!/^[a-z][a-z0-9_]*$/.test(metricData.metricType.trim())) {
      throw new ValidationError('Metric type must start with a letter and contain only lowercase letters, numbers, and underscores');
    }

    if (metricData.metricType.trim().length > 50) {
      throw new ValidationError('Metric type cannot exceed 50 characters');
    }

    if (metricData.metricName.trim().length > 200) {
      throw new ValidationError('Metric name cannot exceed 200 characters');
    }
  }
}