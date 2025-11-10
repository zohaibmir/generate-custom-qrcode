/**
 * Team Collaboration Controller
 * 
 * HTTP request handler for team collaboration features including
 * QR libraries, permissions management, and team dashboard.
 * Follows clean architecture principles with proper error handling and validation.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response } from 'express';
import {
  ILogger,
  ServiceResponse,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  AddToLibraryRequest,
  UpdateLibraryItemRequest,
  TeamDashboardRequest,
  PaginationOptions,
  ValidationError,
  AppError
} from '../interfaces';
import { QRLibraryService } from '../services/qr-library.service';
import { QRPermissionService } from '../services/qr-permission.service';
import { TeamDashboardService } from '../services/team-dashboard.service';

export class TeamCollaborationController {
  private qrLibraryService: QRLibraryService;
  private qrPermissionService: QRPermissionService;
  private teamDashboardService: TeamDashboardService;
  private logger: ILogger;

  constructor(
    qrLibraryService: QRLibraryService,
    qrPermissionService: QRPermissionService,
    teamDashboardService: TeamDashboardService,
    logger: ILogger
  ) {
    this.qrLibraryService = qrLibraryService;
    this.qrPermissionService = qrPermissionService;
    this.teamDashboardService = teamDashboardService;
    this.logger = logger;
  }

  /**
   * Get QR libraries for user's organizations
   */
  async getQRLibraries(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { organizationId, page = 1, limit = 20 } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('organizationId is required')
        });
        return;
      }

      const pagination: PaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await this.qrLibraryService.getLibraries(
        organizationId as string,
        userId,
        pagination
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to retrieve QR libraries');
    }
  }

  /**
   * Create new QR library
   */
  async createQRLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { organizationId, ...createRequest } = req.body;

      // Validate required fields
      if (!organizationId || !createRequest.name) {
        res.status(400).json({
          success: false,
          error: new ValidationError('organizationId and name are required')
        });
        return;
      }

      const result = await this.qrLibraryService.createLibrary(
        organizationId,
        userId,
        createRequest
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to create QR library');
    }
  }

  /**
   * Get specific QR library with items
   */
  async getQRLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId } = req.params;
      const { includeItems = 'true' } = req.query;

      if (!libraryId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId is required')
        });
        return;
      }

      const result = await this.qrLibraryService.getLibrary(
        libraryId,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to retrieve QR library');
    }
  }

  /**
   * Update QR library metadata
   */
  async updateQRLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId } = req.params;
      const updateRequest: UpdateLibraryRequest = req.body;

      if (!libraryId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId is required')
        });
        return;
      }

      const result = await this.qrLibraryService.updateLibrary(
        libraryId,
        userId,
        updateRequest
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to update QR library');
    }
  }

  /**
   * Delete QR library
   */
  async deleteQRLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId } = req.params;

      if (!libraryId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId is required')
        });
        return;
      }

      const result = await this.qrLibraryService.deleteLibrary(libraryId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to delete QR library');
    }
  }

  /**
   * Add QR codes to library
   */
  async addQRsToLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId } = req.params;
      const addRequest: AddToLibraryRequest = req.body;

      if (!libraryId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId is required')
        });
        return;
      }

      // Validate required fields
      if (!addRequest.qrCodeIds || !Array.isArray(addRequest.qrCodeIds) || addRequest.qrCodeIds.length === 0) {
        res.status(400).json({
          success: false,
          error: new ValidationError('qrCodeIds array is required and cannot be empty')
        });
        return;
      }

      const result = await this.qrLibraryService.addToLibrary(
        libraryId,
        userId,
        addRequest
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to add QRs to library');
    }
  }

  /**
   * Update library item (tags, notes)
   */
  async updateLibraryItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId, itemId } = req.params;
      const updateRequest: UpdateLibraryItemRequest = req.body;

      if (!libraryId || !itemId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId and itemId are required')
        });
        return;
      }

      const result = await this.qrLibraryService.updateLibraryItem(
        itemId,
        userId,
        updateRequest
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to update library item');
    }
  }

  /**
   * Remove QR code from library
   */
  async removeQRFromLibrary(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { libraryId, itemId } = req.params;

      if (!libraryId || !itemId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('libraryId and itemId are required')
        });
        return;
      }

      const result = await this.qrLibraryService.removeFromLibrary(
        libraryId,
        itemId,
        userId
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to remove QR from library');
    }
  }

  /**
   * Get QR code permissions
   */
  async getQRPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { qrCodeId } = req.params;

      if (!qrCodeId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('qrCodeId is required')
        });
        return;
      }

      const result = await this.qrPermissionService.getQRPermissions(qrCodeId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to get QR permissions');
    }
  }

  /**
   * Update QR code permissions
   */
  async updateQRPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { qrCodeId } = req.params;
      const { isPublic, permissions } = req.body;

      if (!qrCodeId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('qrCodeId is required')
        });
        return;
      }

      // Validate required fields
      if (permissions && !Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          error: new ValidationError('permissions must be an array')
        });
        return;
      }

      const result = await this.qrPermissionService.updateQRPermissions(
        qrCodeId,
        userId,
        { isPublic, permissions }
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to update QR permissions');
    }
  }

  /**
   * Check QR access permission
   */
  async checkQRPermission(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = this.extractUserId(req);
      const { qrCodeId, permission, userId } = req.body;

      // Validate required fields
      if (!qrCodeId || !permission) {
        res.status(400).json({
          success: false,
          error: new ValidationError('qrCodeId and permission are required')
        });
        return;
      }

      // Use provided userId or default to current user
      const targetUserId = userId || currentUserId;

      const result = await this.qrPermissionService.checkQRAccess(
        qrCodeId,
        targetUserId,
        permission
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to check QR permission');
    }
  }

  /**
   * Get team dashboard data
   */
  async getTeamDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { organizationId } = req.params;
      const { period = '30d', includeActivity = 'true' } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('organizationId is required')
        });
        return;
      }

      const dashboardRequest: TeamDashboardRequest = {
        includeActivity: includeActivity === 'true'
      };

      const result = await this.teamDashboardService.getTeamDashboard(
        organizationId,
        userId,
        dashboardRequest
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to get team dashboard');
    }
  }

  /**
   * Get team activity feed
   */
  async getTeamActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { organizationId } = req.params;
      const { page = 1, limit = 20, activityType } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: new ValidationError('organizationId is required')
        });
        return;
      }

      const pagination: PaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      // Add activity type filter if provided
      const filters: any = {};
      if (activityType) {
        filters.activityType = activityType;
      }

      const result = await this.teamDashboardService.getTeamActivity(
        organizationId,
        userId,
        { ...pagination, ...filters }
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to get team activity');
    }
  }

  /**
   * Get metric history
   */
  async getMetricHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { organizationId, metricType } = req.params;
      const { days = '30', granularity = 'daily' } = req.query;

      if (!organizationId || !metricType) {
        res.status(400).json({
          success: false,
          error: new ValidationError('organizationId and metricType are required')
        });
        return;
      }

      const periodDays = parseInt(days as string, 10);

      // Validate metric type
      const validMetrics = ['qr_codes_count', 'total_scans', 'active_members', 'library_count'];
      if (!validMetrics.includes(metricType)) {
        res.status(400).json({
          success: false,
          error: new ValidationError(`Invalid metric type. Must be one of: ${validMetrics.join(', ')}`)
        });
        return;
      }

      const result = await this.teamDashboardService.getMetricHistory(
        organizationId,
        userId,
        metricType,
        periodDays
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.statusCode || 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      this.handleControllerError(error, res, 'Failed to get metric history');
    }
  }

  /**
   * Extract user ID from request (JWT token or headers)
   */
  private extractUserId(req: Request): string {
    // In a real implementation, extract from JWT token
    // For now, get from headers (set by API Gateway)
    const userId = req.headers['x-user-id'] || req.headers['user-id'];
    
    if (!userId) {
      throw new AppError('User ID not found in request', 401, 'UNAUTHORIZED');
    }

    return userId as string;
  }

  /**
   * Handle controller errors consistently
   */
  private handleControllerError(error: any, res: Response, defaultMessage: string): void {
    this.logger.error(defaultMessage, { error: error.message || error, stack: error.stack });

    const statusCode = error.statusCode || 500;
    const errorCode = error.code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message || defaultMessage,
        statusCode,
        timestamp: new Date().toISOString()
      }
    });
  }
}