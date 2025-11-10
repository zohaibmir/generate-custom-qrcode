/**
 * QR Access Control Repository
 * 
 * Repository implementation for managing fine-grained QR code access control.
 * Provides data access methods for QR-level permissions and access management.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import {
  IQRAccessControlRepository,
  QRAccessControl,
  GrantQRAccessRequest,
  PaginationOptions,
  ILogger,
  NotFoundError,
  ValidationError,
  ConflictError,
  DatabaseError
} from '../interfaces';

export class QRAccessControlRepository implements IQRAccessControlRepository {
  private db: Pool;
  private logger: ILogger;

  constructor(db: Pool, logger: ILogger) {
    this.db = db;
    this.logger = logger;
  }

  async create(data: GrantQRAccessRequest & { qrCodeId: string; grantedBy: string }): Promise<QRAccessControl> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check for existing access control for same user/role
      const existingQuery = data.userId 
        ? 'SELECT id FROM qr_access_control WHERE qr_code_id = $1 AND user_id = $2 AND is_active = true'
        : 'SELECT id FROM qr_access_control WHERE qr_code_id = $1 AND role = $2 AND is_active = true';
      
      const existingParams = data.userId 
        ? [data.qrCodeId, data.userId]
        : [data.qrCodeId, data.role];

      const existingResult = await client.query(existingQuery, existingParams);

      if (existingResult.rows.length > 0) {
        throw new ConflictError('Access control already exists for this QR code and user/role');
      }

      const insertQuery = `
        INSERT INTO qr_access_control (
          qr_code_id, user_id, role, permissions, granted_by, expires_at, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.qrCodeId,
        data.userId || null,
        data.role || null,
        JSON.stringify(data.permissions),
        data.grantedBy,
        data.expiresAt || null
      ]);

      await client.query('COMMIT');

      this.logger.debug('QR access control created', {
        accessControlId: result.rows[0].id,
        qrCodeId: data.qrCodeId,
        userId: data.userId,
        role: data.role,
        grantedBy: data.grantedBy
      });

      return this.mapRowToAccessControl(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof ConflictError) {
        throw error;
      }

      this.logger.error('Failed to create QR access control', {
        qrCodeId: data.qrCodeId,
        userId: data.userId,
        role: data.role,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to create QR access control');
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<QRAccessControl | null> {
    try {
      const query = 'SELECT * FROM qr_access_control WHERE id = $1';
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAccessControl(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find QR access control by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve QR access control');
    }
  }

  async findByQRCode(
    qrCodeId: string, 
    pagination: PaginationOptions
  ): Promise<{ accessControls: QRAccessControl[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM qr_access_control WHERE qr_code_id = $1 AND is_active = true';
      const countResult = await this.db.query(countQuery, [qrCodeId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get access controls
      const dataQuery = `
        SELECT * 
        FROM qr_access_control 
        WHERE qr_code_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const dataResult = await this.db.query(dataQuery, [qrCodeId, pagination.limit, offset]);

      const accessControls = dataResult.rows.map(row => this.mapRowToAccessControl(row));

      this.logger.debug('Retrieved QR access controls', {
        qrCodeId,
        count: accessControls.length,
        total,
        page: pagination.page,
        limit: pagination.limit
      });

      return { accessControls, total };

    } catch (error) {
      this.logger.error('Failed to find QR access controls by QR code', {
        qrCodeId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve QR access controls');
    }
  }

  async findByUser(
    userId: string, 
    pagination: PaginationOptions
  ): Promise<{ accessControls: QRAccessControl[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM qr_access_control 
        WHERE user_id = $1 AND is_active = true 
           AND (expires_at IS NULL OR expires_at > NOW())
      `;
      const countResult = await this.db.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get access controls
      const dataQuery = `
        SELECT * 
        FROM qr_access_control 
        WHERE user_id = $1 AND is_active = true 
           AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const dataResult = await this.db.query(dataQuery, [userId, pagination.limit, offset]);

      const accessControls = dataResult.rows.map(row => this.mapRowToAccessControl(row));

      this.logger.debug('Retrieved user QR access controls', {
        userId,
        count: accessControls.length,
        total,
        page: pagination.page,
        limit: pagination.limit
      });

      return { accessControls, total };

    } catch (error) {
      this.logger.error('Failed to find QR access controls by user', {
        userId,
        pagination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to retrieve user QR access controls');
    }
  }

  async checkAccess(qrCodeId: string, userId?: string, role?: string): Promise<QRAccessControl | null> {
    try {
      let query: string;
      let params: any[];

      if (userId) {
        // Check user-specific access
        query = `
          SELECT * 
          FROM qr_access_control 
          WHERE qr_code_id = $1 AND user_id = $2 AND is_active = true
             AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;
        params = [qrCodeId, userId];
      } else if (role) {
        // Check role-based access
        query = `
          SELECT * 
          FROM qr_access_control 
          WHERE qr_code_id = $1 AND role = $2 AND is_active = true
             AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;
        params = [qrCodeId, role];
      } else {
        throw new ValidationError('Either userId or role must be provided');
      }

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAccessControl(result.rows[0]);

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      this.logger.error('Failed to check QR access', {
        qrCodeId,
        userId,
        role,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to check QR access');
    }
  }

  async update(id: string, updates: Partial<GrantQRAccessRequest>): Promise<QRAccessControl> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if access control exists
      const existsQuery = 'SELECT id FROM qr_access_control WHERE id = $1';
      const existsResult = await client.query(existsQuery, [id]);

      if (existsResult.rows.length === 0) {
        throw new NotFoundError('QR access control not found');
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      if (updates.permissions !== undefined) {
        updateFields.push(`permissions = $${paramCount}`);
        updateValues.push(JSON.stringify(updates.permissions));
        paramCount++;
      }

      if (updates.expiresAt !== undefined) {
        updateFields.push(`expires_at = $${paramCount}`);
        updateValues.push(updates.expiresAt);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const updateQuery = `
        UPDATE qr_access_control 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      await client.query('COMMIT');

      this.logger.info('QR access control updated', {
        accessControlId: id,
        updates: Object.keys(updates)
      });

      return this.mapRowToAccessControl(result.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      this.logger.error('Failed to update QR access control', {
        id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to update QR access control');
    } finally {
      client.release();
    }
  }

  async revoke(id: string): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE qr_access_control 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;

      const result = await client.query(updateQuery, [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('QR access control not found');
      }

      await client.query('COMMIT');

      this.logger.info('QR access control revoked', {
        accessControlId: id
      });

    } catch (error) {
      await client.query('ROLLBACK');

      if (error instanceof NotFoundError) {
        throw error;
      }

      this.logger.error('Failed to revoke QR access control', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to revoke QR access control');
    } finally {
      client.release();
    }
  }

  async bulkRevoke(qrCodeId: string, userIds?: string[], roles?: string[]): Promise<number> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      let query: string;
      let params: any[];

      if (userIds && userIds.length > 0) {
        query = `
          UPDATE qr_access_control 
          SET is_active = false, updated_at = NOW()
          WHERE qr_code_id = $1 AND user_id = ANY($2) AND is_active = true
        `;
        params = [qrCodeId, userIds];
      } else if (roles && roles.length > 0) {
        query = `
          UPDATE qr_access_control 
          SET is_active = false, updated_at = NOW()
          WHERE qr_code_id = $1 AND role = ANY($2) AND is_active = true
        `;
        params = [qrCodeId, roles];
      } else {
        throw new ValidationError('Either userIds or roles must be provided');
      }

      const result = await client.query(query, params);
      const revokedCount = result.rowCount || 0;

      await client.query('COMMIT');

      this.logger.info('Bulk revoked QR access controls', {
        qrCodeId,
        revokedCount,
        userIds: userIds?.length,
        roles: roles?.length
      });

      return revokedCount;

    } catch (error) {
      await client.query('ROLLBACK');

      if (error instanceof ValidationError) {
        throw error;
      }

      this.logger.error('Failed to bulk revoke QR access controls', {
        qrCodeId,
        userIds,
        roles,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to bulk revoke QR access controls');
    } finally {
      client.release();
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const query = `
        UPDATE qr_access_control 
        SET is_active = false, updated_at = NOW()
        WHERE expires_at <= NOW() AND is_active = true
      `;

      const result = await this.db.query(query);
      const cleanedCount = result.rowCount || 0;

      this.logger.info('Cleaned up expired QR access controls', {
        cleanedCount
      });

      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired QR access controls', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DatabaseError('Failed to cleanup expired QR access controls');
    }
  }

  private mapRowToAccessControl(row: any): QRAccessControl {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      userId: row.user_id,
      role: row.role,
      permissions: row.permissions ? JSON.parse(row.permissions) : {},
      grantedBy: row.granted_by,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}