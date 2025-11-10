import { Pool, PoolClient } from 'pg';
import {
  IQRLibraryItemRepository,
  QRLibraryItem,
  QRLibraryItemWithQR,
  UpdateLibraryItemRequest,
  PaginationOptions,
  ILogger,
  AppError,
  NotFoundError,
  ValidationError
} from '../interfaces';

export class QRLibraryItemRepository implements IQRLibraryItemRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(data: {
    libraryId: string;
    qrCodeId: string;
    addedBy: string;
    position?: number;
    notes?: string;
    tags?: string[];
    isFeatured?: boolean;
  }): Promise<QRLibraryItem> {
    const client: PoolClient = await this.db.connect();
    
    try {
      // Get next position if not provided
      let position = data.position;
      if (position === undefined) {
        const posQuery = 'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM qr_library_items WHERE library_id = $1';
        const posResult = await client.query(posQuery, [data.libraryId]);
        position = posResult.rows[0].next_pos;
      }

      const query = `
        INSERT INTO qr_library_items 
        (library_id, qr_code_id, added_by, position, notes, tags, is_featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        data.libraryId,
        data.qrCodeId,
        data.addedBy,
        position,
        data.notes || null,
        data.tags || [],
        data.isFeatured || false
      ];

      this.logger.debug('Adding QR to library', { 
        libraryId: data.libraryId, 
        qrCodeId: data.qrCodeId,
        position
      });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new AppError('Failed to add QR to library - no data returned', 500, 'DATABASE_ERROR');
      }

      const item = this.mapRowToItem(result.rows[0]);
      
      this.logger.info('QR added to library successfully', { 
        itemId: item.id, 
        libraryId: item.libraryId,
        qrCodeId: item.qrCodeId
      });
      
      return item;
      
    } catch (error) {
      this.logger.error('Failed to add QR to library', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        libraryId: data.libraryId,
        qrCodeId: data.qrCodeId
      });
      
      // Check for duplicate key error
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new ValidationError('QR code already exists in this library');
      }
      
      if (error instanceof AppError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new AppError('Failed to add QR to library', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<QRLibraryItem | null> {
    try {
      const query = 'SELECT * FROM qr_library_items WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      this.logger.debug('Library item lookup by ID', { 
        itemId: id, 
        found: result.rows.length > 0 
      });
      
      return result.rows.length > 0 ? this.mapRowToItem(result.rows[0]) : null;
      
    } catch (error) {
      this.logger.error('Failed to find library item by ID', { 
        itemId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to find library item by ID', 500, 'DATABASE_ERROR');
    }
  }

  async findByLibrary(
    libraryId: string, 
    pagination: PaginationOptions
  ): Promise<{ items: QRLibraryItemWithQR[]; total: number }> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      const sortBy = pagination.sortBy || 'position';
      const sortOrder = pagination.sortOrder || 'asc';

      // Count query
      const countQuery = 'SELECT COUNT(*) as total FROM qr_library_items WHERE library_id = $1';
      const countResult = await this.db.query(countQuery, [libraryId]);
      const total = parseInt(countResult.rows[0].total);

      // Data query with QR code details
      const dataQuery = `
        SELECT 
          li.*,
          qr.id as qr_id,
          qr.name as qr_name,
          qr.type as qr_type,
          qr.short_id as qr_short_id,
          qr.is_active as qr_is_active,
          qr.current_scans as qr_current_scans,
          qr.created_at as qr_created_at
        FROM qr_library_items li
        JOIN qr_codes qr ON li.qr_code_id = qr.id
        WHERE li.library_id = $1 
        ORDER BY li.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;
      
      const dataResult = await this.db.query(dataQuery, [libraryId, pagination.limit, offset]);
      
      const items = dataResult.rows.map(row => this.mapRowToItemWithQR(row));
      
      this.logger.debug('Retrieved library items', { 
        libraryId,
        count: items.length,
        total 
      });
      
      return { items, total };
      
    } catch (error) {
      this.logger.error('Failed to get library items', { 
        libraryId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to get library items', 500, 'DATABASE_ERROR');
    }
  }

  async findByQRCode(qrCodeId: string): Promise<QRLibraryItem[]> {
    try {
      const query = `
        SELECT li.*, l.name as library_name, l.organization_id
        FROM qr_library_items li
        JOIN qr_libraries l ON li.library_id = l.id
        WHERE li.qr_code_id = $1
        ORDER BY li.created_at DESC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      const items = result.rows.map(row => this.mapRowToItem(row));
      
      this.logger.debug('Found QR code in libraries', { 
        qrCodeId,
        libraryCount: items.length
      });
      
      return items;
      
    } catch (error) {
      this.logger.error('Failed to find QR code in libraries', { 
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new AppError('Failed to find QR code in libraries', 500, 'DATABASE_ERROR');
    }
  }

  async update(id: string, updates: UpdateLibraryItemRequest): Promise<QRLibraryItem> {
    const client: PoolClient = await this.db.connect();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.position !== undefined) {
        updateFields.push(`position = $${paramCount}`);
        values.push(updates.position);
        paramCount++;
      }

      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramCount}`);
        values.push(updates.notes);
        paramCount++;
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramCount}`);
        values.push(updates.tags);
        paramCount++;
      }

      if (updates.isFeatured !== undefined) {
        updateFields.push(`is_featured = $${paramCount}`);
        values.push(updates.isFeatured);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(id); // Add ID for WHERE clause

      const query = `
        UPDATE qr_library_items 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      this.logger.debug('Updating library item', { 
        itemId: id, 
        fields: Object.keys(updates) 
      });

      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new NotFoundError('Library item not found');
      }

      const item = this.mapRowToItem(result.rows[0]);
      
      this.logger.info('Library item updated successfully', { 
        itemId: item.id,
        updatedFields: Object.keys(updates)
      });
      
      return item;
      
    } catch (error) {
      this.logger.error('Failed to update library item', { 
        itemId: id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof AppError || error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new AppError('Failed to update library item', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      // Check if item exists
      const checkQuery = 'SELECT id, library_id, qr_code_id FROM qr_library_items WHERE id = $1';
      const checkResult = await client.query(checkQuery, [id]);
      
      if (!checkResult.rows[0]) {
        throw new NotFoundError('Library item not found');
      }

      const { library_id, qr_code_id } = checkResult.rows[0];

      // Delete item
      const deleteQuery = 'DELETE FROM qr_library_items WHERE id = $1';
      await client.query(deleteQuery, [id]);
      
      this.logger.info('Library item removed successfully', { 
        itemId: id,
        libraryId: library_id,
        qrCodeId: qr_code_id
      });
      
    } catch (error) {
      this.logger.error('Failed to remove library item', { 
        itemId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new AppError('Failed to remove library item', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async bulkCreate(items: Array<{
    libraryId: string;
    qrCodeId: string;
    addedBy: string;
    notes?: string;
    tags?: string[];
  }>): Promise<QRLibraryItem[]> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const results: QRLibraryItem[] = [];

      for (const item of items) {
        // Get next position for each item
        const posQuery = 'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM qr_library_items WHERE library_id = $1';
        const posResult = await client.query(posQuery, [item.libraryId]);
        const position = posResult.rows[0].next_pos;

        const insertQuery = `
          INSERT INTO qr_library_items 
          (library_id, qr_code_id, added_by, position, notes, tags, is_featured)
          VALUES ($1, $2, $3, $4, $5, $6, false)
          RETURNING *
        `;
        
        const values = [
          item.libraryId,
          item.qrCodeId,
          item.addedBy,
          position,
          item.notes || null,
          item.tags || []
        ];

        try {
          const result = await client.query(insertQuery, values);
          if (result.rows[0]) {
            results.push(this.mapRowToItem(result.rows[0]));
          }
        } catch (itemError) {
          // Skip duplicates but continue with others
          if (itemError instanceof Error && itemError.message.includes('duplicate key')) {
            this.logger.warn('Skipped duplicate QR in library', { 
              libraryId: item.libraryId, 
              qrCodeId: item.qrCodeId 
            });
            continue;
          }
          throw itemError;
        }
      }

      await client.query('COMMIT');
      
      this.logger.info('Bulk library items created', { 
        requestedCount: items.length,
        createdCount: results.length
      });
      
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error('Failed to bulk create library items', { 
        itemCount: items.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new AppError('Failed to bulk create library items', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async bulkDelete(libraryId: string, qrCodeIds: string[]): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM qr_library_items 
        WHERE library_id = $1 AND qr_code_id = ANY($2)
      `;
      
      const result = await client.query(query, [libraryId, qrCodeIds]);
      
      this.logger.info('Bulk library items removed', { 
        libraryId,
        requestedCount: qrCodeIds.length,
        deletedCount: result.rowCount
      });
      
    } catch (error) {
      this.logger.error('Failed to bulk delete library items', { 
        libraryId,
        qrCodeIds: qrCodeIds.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new AppError('Failed to bulk delete library items', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  async reorderItems(libraryId: string, itemOrders: Array<{ id: string; position: number }>): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      for (const { id, position } of itemOrders) {
        const updateQuery = `
          UPDATE qr_library_items 
          SET position = $1 
          WHERE id = $2 AND library_id = $3
        `;
        
        await client.query(updateQuery, [position, id, libraryId]);
      }

      await client.query('COMMIT');
      
      this.logger.info('Library items reordered', { 
        libraryId,
        itemCount: itemOrders.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error('Failed to reorder library items', { 
        libraryId,
        itemCount: itemOrders.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new AppError('Failed to reorder library items', 500, 'DATABASE_ERROR');
    } finally {
      client.release();
    }
  }

  private mapRowToItem(row: any): QRLibraryItem {
    return {
      id: row.id,
      libraryId: row.library_id,
      qrCodeId: row.qr_code_id,
      addedBy: row.added_by,
      position: row.position || 0,
      notes: row.notes,
      tags: row.tags || [],
      isFeatured: row.is_featured || false,
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToItemWithQR(row: any): QRLibraryItemWithQR {
    return {
      ...this.mapRowToItem(row),
      qrCode: {
        id: row.qr_id,
        name: row.qr_name,
        type: row.qr_type,
        shortId: row.qr_short_id,
        isActive: row.qr_is_active,
        currentScans: row.qr_current_scans || 0,
        createdAt: new Date(row.qr_created_at)
      }
    };
  }
}