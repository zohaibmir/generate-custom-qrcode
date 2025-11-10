/**
 * QR Permission Service
 * 
 * Business logic service for managing fine-grained QR code access control and permissions.
 * Handles QR-level permission management, access validation, and permission logging.
 * 
 * @author AI Agent
 * @date 2024
 */

import {
  IQRPermissionService,
  IQRAccessControlRepository,
  ILogger,
  QRAccessControl,
  QRAccessLog,
  GrantQRAccessRequest,
  PaginationOptions,
  ServiceResponse,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
  TeamRole
} from '../interfaces';

export class QRPermissionService implements IQRPermissionService {
  private accessControlRepo: IQRAccessControlRepository;
  private logger: ILogger;

  constructor(
    accessControlRepo: IQRAccessControlRepository,
    logger: ILogger
  ) {
    this.accessControlRepo = accessControlRepo;
    this.logger = logger;
  }

  async grantQRAccess(
    qrCodeId: string, 
    userId: string, 
    data: GrantQRAccessRequest
  ): Promise<ServiceResponse<QRAccessControl>> {
    try {
      // Validate input
      this.validateGrantAccessRequest(data);

      // TODO: Check if user has permission to grant access to this QR code
      // This would require integration with QR service to validate ownership

      // Validate permissions structure
      this.validatePermissionStructure(data.permissions);

      // Create access control
      const createData = {
        qrCodeId,
        permissions: data.permissions,
        grantedBy: userId,
        ...(data.userId && { userId: data.userId }),
        ...(data.role && { role: data.role }),
        ...(data.expiresAt && { expiresAt: data.expiresAt })
      };

      const accessControl = await this.accessControlRepo.create(createData);

      this.logger.info('QR access granted successfully', {
        qrCodeId,
        grantedBy: userId,
        targetUserId: data.userId,
        targetRole: data.role,
        accessControlId: accessControl.id
      });

      return { success: true, data: accessControl };

    } catch (error) {
      this.logger.error('Failed to grant QR access', {
        qrCodeId,
        userId,
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to grant QR access', 500, 'INTERNAL_ERROR');
    }
  }

  async revokeQRAccess(
    qrCodeId: string, 
    userId: string, 
    accessId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get access control to validate
      const accessControl = await this.accessControlRepo.findById(accessId);
      if (!accessControl) {
        throw new NotFoundError('Access control not found');
      }

      // Check if it belongs to the specified QR code
      if (accessControl.qrCodeId !== qrCodeId) {
        throw new ValidationError('Access control does not belong to specified QR code');
      }

      // TODO: Check if user has permission to revoke access for this QR code
      // This would require integration with QR service to validate ownership

      // Revoke access
      await this.accessControlRepo.revoke(accessId);

      this.logger.info('QR access revoked successfully', {
        qrCodeId,
        revokedBy: userId,
        accessControlId: accessId,
        targetUserId: accessControl.userId,
        targetRole: accessControl.role
      });

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Failed to revoke QR access', {
        qrCodeId,
        userId,
        accessId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to revoke QR access', 500, 'INTERNAL_ERROR');
    }
  }

  async checkQRAccess(
    qrCodeId: string, 
    userId: string, 
    permission: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const hasAccess = await this.validateQRPermission(qrCodeId, userId, permission);

      this.logger.debug('QR access check completed', {
        qrCodeId,
        userId,
        permission,
        hasAccess
      });

      return { success: true, data: hasAccess };

    } catch (error) {
      this.logger.error('Failed to check QR access', {
        qrCodeId,
        userId,
        permission,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to check QR access', 500, 'INTERNAL_ERROR');
    }
  }

  async getQRPermissions(
    qrCodeId: string, 
    userId: string
  ): Promise<ServiceResponse<QRAccessControl[]>> {
    try {
      // TODO: Check if user has permission to view permissions for this QR code
      
      const result = await this.accessControlRepo.findByQRCode(qrCodeId, { page: 1, limit: 100 });

      this.logger.debug('Retrieved QR permissions', {
        qrCodeId,
        userId,
        count: result.accessControls.length
      });

      return { 
        success: true, 
        data: result.accessControls,
        meta: { total: result.total }
      };

    } catch (error) {
      this.logger.error('Failed to get QR permissions', {
        qrCodeId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to retrieve QR permissions', 500, 'INTERNAL_ERROR');
    }
  }

  async updateQRPermissions(
    qrCodeId: string, 
    userId: string, 
    permissions: Record<string, any>
  ): Promise<ServiceResponse<void>> {
    try {
      // Validate permissions structure
      this.validatePermissionStructure(permissions);

      // TODO: Check if user has permission to update permissions for this QR code

      // Get user's access control
      const accessControl = await this.accessControlRepo.checkAccess(qrCodeId, userId);
      if (!accessControl) {
        throw new NotFoundError('No access control found for user and QR code');
      }

      // Update permissions
      await this.accessControlRepo.update(accessControl.id, { permissions });

      this.logger.info('QR permissions updated', {
        qrCodeId,
        userId,
        accessControlId: accessControl.id,
        permissionKeys: Object.keys(permissions)
      });

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Failed to update QR permissions', {
        qrCodeId,
        userId,
        permissions,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to update QR permissions', 500, 'INTERNAL_ERROR');
    }
  }

  async logQRAccess(
    qrCodeId: string, 
    userId: string, 
    action: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: Implement access logging repository
      // For now, just log to service logger
      this.logger.info('QR access logged', {
        qrCodeId,
        userId,
        action,
        metadata,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to log QR access', {
        qrCodeId,
        userId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw error for logging failures to avoid breaking main flow
    }
  }

  async getQRAccessLog(
    qrCodeId: string, 
    userId: string, 
    pagination: PaginationOptions
  ): Promise<ServiceResponse<QRAccessLog[]>> {
    try {
      // TODO: Check if user has permission to view access logs for this QR code
      
      // TODO: Implement access log repository
      // For now, return empty array
      const logs: QRAccessLog[] = [];

      this.logger.debug('Retrieved QR access logs', {
        qrCodeId,
        userId,
        count: logs.length
      });

      return { 
        success: true, 
        data: logs,
        meta: { total: 0 }
      };

    } catch (error) {
      this.logger.error('Failed to get QR access log', {
        qrCodeId,
        userId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to retrieve QR access log', 500, 'INTERNAL_ERROR');
    }
  }

  // Helper methods
  
  async validateQRPermission(qrCodeId: string, userId: string, permission: string): Promise<boolean> {
    try {
      // Check direct user access
      const userAccess = await this.accessControlRepo.checkAccess(qrCodeId, userId);
      if (userAccess) {
        return this.hasPermission(userAccess.permissions, permission);
      }

      // TODO: Check role-based access by getting user's role in organization
      // For now, return false
      
      return false;

    } catch (error) {
      this.logger.error('Failed to validate QR permission', {
        qrCodeId,
        userId,
        permission,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false; // Default to no access on error
    }
  }

  private hasPermission(userPermissions: Record<string, any>, requiredPermission: string): boolean {
    // Check if user has the specific permission
    if (userPermissions[requiredPermission] === true) {
      return true;
    }

    // Check for admin or full access
    if (userPermissions.admin === true || userPermissions['*'] === true) {
      return true;
    }

    // Check for wildcard permissions
    const permissionParts = requiredPermission.split('.');
    for (let i = 0; i < permissionParts.length; i++) {
      const wildcardPermission = permissionParts.slice(0, i + 1).join('.') + '.*';
      if (userPermissions[wildcardPermission] === true) {
        return true;
      }
    }

    return false;
  }

  private validateGrantAccessRequest(data: GrantQRAccessRequest): void {
    if (!data.userId && !data.role) {
      throw new ValidationError('Either userId or role must be specified');
    }

    if (data.userId && data.role) {
      throw new ValidationError('Cannot specify both userId and role');
    }

    if (!data.permissions || Object.keys(data.permissions).length === 0) {
      throw new ValidationError('Permissions object is required and cannot be empty');
    }

    if (data.role && !['owner', 'admin', 'editor', 'viewer'].includes(data.role)) {
      throw new ValidationError('Invalid role specified');
    }

    if (data.expiresAt && data.expiresAt <= new Date()) {
      throw new ValidationError('Expiration date must be in the future');
    }
  }

  private validatePermissionStructure(permissions: Record<string, any>): void {
    const validPermissions = [
      'read', 'update', 'delete', 'share', 'analytics.view', 'analytics.export',
      'admin', '*' // Special permissions
    ];

    for (const [permission, value] of Object.entries(permissions)) {
      if (typeof value !== 'boolean') {
        throw new ValidationError(`Permission value for '${permission}' must be boolean`);
      }

      // Allow wildcard permissions (ending with .*)
      if (permission.endsWith('.*')) {
        continue;
      }

      // Check if it's a valid permission
      if (!validPermissions.includes(permission) && !permission.includes('.')) {
        throw new ValidationError(`Invalid permission: '${permission}'`);
      }
    }
  }

  // Cleanup and maintenance methods
  
  async cleanupExpiredPermissions(): Promise<number> {
    try {
      const cleanedCount = await this.accessControlRepo.cleanupExpired();

      this.logger.info('Cleaned up expired QR permissions', {
        cleanedCount
      });

      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired QR permissions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to cleanup expired permissions', 500, 'INTERNAL_ERROR');
    }
  }

  async getUserQRAccess(userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRAccessControl[]>> {
    try {
      const result = await this.accessControlRepo.findByUser(userId, pagination);

      this.logger.debug('Retrieved user QR access', {
        userId,
        count: result.accessControls.length,
        total: result.total
      });

      return {
        success: true,
        data: result.accessControls,
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
      this.logger.error('Failed to get user QR access', {
        userId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError('Failed to retrieve user QR access', 500, 'INTERNAL_ERROR');
    }
  }
}