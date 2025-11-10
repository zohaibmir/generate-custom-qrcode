import { Pool, PoolClient } from 'pg';
import {
  IQRLibraryRepository,
  QRLibrary,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  PaginationOptions,
  ILogger,
  AppError,
  NotFoundError,
  ValidationError
} from '../interfaces';

export class QRLibraryRepository implements IQRLibraryRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(data: CreateLibraryRequest & { organizationId: string; createdBy: string }): Promise<QRLibrary> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO qr_libraries 
        (organization_id, name, description, color_hex, icon, is_public, created_by, settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        data.organizationId,
        data.name,
        data.description || null,
        data.colorHex || '#3B82F6',
        data.icon || 'folder',
        data.isPublic !== undefined ? data.isPublic : false,
        data.createdBy,
        JSON.stringify(data.settings || {})
      ];

      this.logger.debug('Creating QR library', { 
        organizationId: data.organizationId, 
        name: data.name,
        createdBy: data.createdBy
      });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new AppError('Failed to create QR library - no data returned', 500, 'DATABASE_ERROR');
      }

      const library = this.mapRowToLibrary(result.rows[0]);
      
      this.logger.info('QR library created successfully', { 
        libraryId: library.id, 
        organizationId: library.organizationId,
        name: library.name
      });
      
      return library;
      
    } catch (error) {
      this.logger.error('Failed to create QR library', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: data.organizationId,
        name: data.name
      });
      
      if (error instanceof AppError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to create QR library',
        500,
        'DATABASE_ERROR'
      );
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<QRLibrary | null> {
    try {
      const query = 'SELECT * FROM qr_libraries WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      this.logger.debug('QR library lookup by ID', { 
        libraryId: id, 
        found: result.rows.length > 0 
      });
      
      return result.rows.length > 0 ? this.mapRowToLibrary(result.rows[0]) : null;
      
    } catch (error) {
      this.logger.error('Failed to find QR library by ID', { 
        libraryId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to find QR library by ID', 500, 'DATABASE_ERROR');
    }
  }

  async findByOrganization(
    organizationId: string, 
    pagination: PaginationOptions
  ): Promise<{ libraries: QRLibrary[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';

      // Count query
      const countQuery = 'SELECT COUNT(*) as total FROM qr_libraries WHERE organization_id = $1';
      const countResult = await this.db.query(countQuery, [organizationId]);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT * FROM qr_libraries 
        WHERE organization_id = $1 
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;
      
      const dataResult = await this.db.query(dataQuery, [organizationId, pagination.limit, offset]);
      
      const libraries = dataResult.rows.map(row => this.mapRowToLibrary(row));
      
      this.logger.debug('Retrieved organization libraries', { 
        organizationId,
        count: libraries.length,
        total 
      });
      
      return { libraries, total };
      
    } catch (error) {
      this.logger.error('Failed to get organization libraries', { 
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to get organization libraries', 500, 'DATABASE_ERROR');
    }
  }

  async findUserAccessibleLibraries(
    organizationId: string, 
    userId: string,
    pagination: PaginationOptions
  ): Promise<{ libraries: QRLibrary[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';

      // Get user's role in organization
      const roleQuery = `
        SELECT role FROM organization_members 
        WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
      `;
      const roleResult = await this.db.query(roleQuery, [organizationId, userId]);
      
      if (!roleResult.rows[0]) {
        throw new ValidationError('User not found in organization');
      }
      
      const userRole = roleResult.rows[0].role;

      // Count query - libraries user can access
      const countQuery = `
        SELECT COUNT(DISTINCT l.id) as total 
        FROM qr_libraries l
        LEFT JOIN qr_library_permissions p ON l.id = p.library_id
        WHERE l.organization_id = $1 
        AND (
          l.is_public = true 
          OR l.created_by = $2
          OR p.user_id = $2 
          OR p.role = $3
        )
      `;
      const countResult = await this.db.query(countQuery, [organizationId, userId, userRole]);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT DISTINCT l.* 
        FROM qr_libraries l
        LEFT JOIN qr_library_permissions p ON l.id = p.library_id
        WHERE l.organization_id = $1 
        AND (
          l.is_public = true 
          OR l.created_by = $2
          OR p.user_id = $2 
          OR p.role = $3
        )
        ORDER BY l.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $4 OFFSET $5
      `;
      
      const dataResult = await this.db.query(dataQuery, [
        organizationId, userId, userRole, pagination.limit, offset
      ]);
      
      const libraries = dataResult.rows.map(row => this.mapRowToLibrary(row));
      
      this.logger.debug('Retrieved user accessible libraries', { 
        organizationId,
        userId,
        userRole,
        count: libraries.length,
        total 
      });
      
      return { libraries, total };
      
    } catch (error) {
      this.logger.error('Failed to get user accessible libraries', { 
        organizationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new AppError('Failed to get user accessible libraries', 500, 'DATABASE_ERROR');
    }
  }

  async update(id: string, updates: UpdateLibraryRequest): Promise<QRLibrary> {
    const client: PoolClient = await this.db.connect();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(updates.name);
        paramCount++;
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        values.push(updates.description);
        paramCount++;
      }

      if (updates.colorHex !== undefined) {
        updateFields.push(`color_hex = $${paramCount}`);
        values.push(updates.colorHex);
        paramCount++;
      }

      if (updates.icon !== undefined) {
        updateFields.push(`icon = $${paramCount}`);
        values.push(updates.icon);
        paramCount++;
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramCount}`);
        values.push(updates.isPublic);
        paramCount++;
      }

      if (updates.settings !== undefined) {
        updateFields.push(`settings = $${paramCount}`);
        values.push(JSON.stringify(updates.settings));
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Always update the updated_at timestamp
      updateFields.push('updated_at = NOW()');
      values.push(id); // Add ID for WHERE clause

      const query = `
        UPDATE qr_libraries 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      this.logger.debug('Updating QR library', { 
        libraryId: id, 
        fields: Object.keys(updates) 
      });

      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new NotFoundError('QR library not found');
      }

      const library = this.mapRowToLibrary(result.rows[0]);
      
      this.logger.info('QR library updated successfully', { 
        libraryId: library.id,
        updatedFields: Object.keys(updates)
      });
      
      return library;
      
    } catch (error) {
      this.logger.error('Failed to update QR library', { 
        libraryId: id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof AppError || error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new AppError('Failed to update QR library', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if library exists
      const checkQuery = 'SELECT id, name FROM qr_libraries WHERE id = $1';
      const checkResult = await client.query(checkQuery, [id]);
      
      if (!checkResult.rows[0]) {
        throw new NotFoundError('QR library not found');
      }

      const libraryName = checkResult.rows[0].name;

      // Delete library (CASCADE will handle related records)
      const deleteQuery = 'DELETE FROM qr_libraries WHERE id = $1';
      await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      
      this.logger.info('QR library deleted successfully', { 
        libraryId: id,
        libraryName
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error('Failed to delete QR library', { 
        libraryId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new AppError('Failed to delete QR library', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async getStats(libraryId: string): Promise<{ itemCount: number; scanCount: number; memberCount: number }> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT li.id) as item_count,
          COALESCE(SUM(qr.current_scans), 0) as total_scans,
          COUNT(DISTINCT p.user_id) as member_count
        FROM qr_libraries l
        LEFT JOIN qr_library_items li ON l.id = li.library_id
        LEFT JOIN qr_codes qr ON li.qr_code_id = qr.id
        LEFT JOIN qr_library_permissions p ON l.id = p.library_id
        WHERE l.id = $1
        GROUP BY l.id
      `;
      
      const result = await this.db.query(query, [libraryId]);
      
      if (!result.rows[0]) {
        return { itemCount: 0, scanCount: 0, memberCount: 0 };
      }
      
      const stats = {
        itemCount: parseInt(result.rows[0].item_count) || 0,
        scanCount: parseInt(result.rows[0].total_scans) || 0,
        memberCount: parseInt(result.rows[0].member_count) || 0
      };
      
      this.logger.debug('Retrieved library stats', { libraryId, stats });
      
      return stats;
      
    } catch (error) {
      this.logger.error('Failed to get library stats', { 
        libraryId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to get library stats', 500, 'DATABASE_ERROR');
    }
  }

  private mapRowToLibrary(row: any): QRLibrary {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      colorHex: row.color_hex,
      icon: row.icon,
      isPublic: row.is_public,
      isDefault: row.is_default || false,
      createdBy: row.created_by,
      settings: row.settings || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}