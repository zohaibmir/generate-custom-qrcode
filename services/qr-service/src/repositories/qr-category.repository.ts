import { Pool } from 'pg';
import { 
  IQRCategoryRepository, 
  QRCategory, 
  CategoryQueryOptions,
  ILogger,
  DatabaseError,
  NotFoundError 
} from '../interfaces';

/**
 * QR Category Repository - Data Access Layer
 * 
 * Handles all database operations for QR categories
 * Follows clean architecture principles with dependency inversion
 */
export class QRCategoryRepository implements IQRCategoryRepository {
  constructor(
    private readonly database: Pool,
    private readonly logger: ILogger
  ) {}

  /**
   * Create a new QR category
   */
  async create(categoryData: any): Promise<QRCategory> {
    const client = await this.database.connect();
    
    try {
      const query = `
        INSERT INTO qr_categories (
          user_id, parent_id, name, description, color, icon, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        categoryData.userId,
        categoryData.parentId || null,
        categoryData.name,
        categoryData.description || null,
        categoryData.color || '#3B82F6',
        categoryData.icon || '📁',
        categoryData.sortOrder || 0
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create category');
      }
      
      const category = this.mapRowToCategory(result.rows[0]);
      
      this.logger.info('Category created successfully', {
        categoryId: category.id,
        name: category.name,
        userId: category.userId
      });
      
      return category;
      
    } catch (error) {
      this.logger.error('Failed to create category', { error, categoryData });
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new DatabaseError('Category name already exists in this location');
      }
      
      throw error instanceof DatabaseError ? error : new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<QRCategory | null> {
    const client = await this.database.connect();
    
    try {
      const query = 'SELECT * FROM qr_categories WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCategory(result.rows[0]);
      
    } catch (error) {
      this.logger.error('Failed to find category by ID', { error, categoryId: id });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Find categories by user ID
   */
  async findByUserId(userId: string, options: CategoryQueryOptions = {}): Promise<QRCategory[]> {
    const client = await this.database.connect();
    
    try {
      let query = 'SELECT * FROM qr_categories WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;
      
      // Add parent ID filter
      if (options.parentId !== undefined) {
        if (options.parentId === null) {
          query += ' AND parent_id IS NULL';
        } else {
          query += ` AND parent_id = $${paramIndex}`;
          values.push(options.parentId);
          paramIndex++;
        }
      }
      
      // Add sorting
      const sortBy = options.sortBy || 'sortOrder';
      const sortOrder = options.sortOrder || 'asc';
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      
      const result = await client.query(query, values);
      
      return result.rows.map(row => this.mapRowToCategory(row));
      
    } catch (error) {
      this.logger.error('Failed to find categories by user ID', { error, userId, options });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Update category
   */
  async update(id: string, categoryData: any): Promise<QRCategory> {
    const client = await this.database.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Build dynamic update query
      if (categoryData.name !== undefined) {
        fields.push(`name = $${paramIndex}`);
        values.push(categoryData.name);
        paramIndex++;
      }
      
      if (categoryData.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(categoryData.description);
        paramIndex++;
      }
      
      if (categoryData.color !== undefined) {
        fields.push(`color = $${paramIndex}`);
        values.push(categoryData.color);
        paramIndex++;
      }
      
      if (categoryData.icon !== undefined) {
        fields.push(`icon = $${paramIndex}`);
        values.push(categoryData.icon);
        paramIndex++;
      }
      
      if (categoryData.sortOrder !== undefined) {
        fields.push(`sort_order = $${paramIndex}`);
        values.push(categoryData.sortOrder);
        paramIndex++;
      }
      
      if (categoryData.parentId !== undefined) {
        fields.push(`parent_id = $${paramIndex}`);
        values.push(categoryData.parentId);
        paramIndex++;
      }
      
      if (fields.length === 0) {
        throw new DatabaseError('No fields to update');
      }
      
      // Add updated_at
      fields.push(`updated_at = NOW()`);
      
      // Add ID parameter
      values.push(id);
      
      const query = `
        UPDATE qr_categories 
        SET ${fields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Category');
      }
      
      const category = this.mapRowToCategory(result.rows[0]);
      
      this.logger.info('Category updated successfully', {
        categoryId: category.id,
        name: category.name
      });
      
      return category;
      
    } catch (error) {
      this.logger.error('Failed to update category', { error, categoryId: id, categoryData });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new DatabaseError('Category name already exists in this location');
      }
      
      throw error instanceof DatabaseError ? error : new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Delete category
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if category exists and get info
      const categoryResult = await client.query(
        'SELECT name, user_id FROM qr_categories WHERE id = $1',
        [id]
      );
      
      if (categoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      const categoryInfo = categoryResult.rows[0];
      
      // Delete the category (cascade will handle children and QR references)
      const deleteResult = await client.query(
        'DELETE FROM qr_categories WHERE id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      
      this.logger.info('Category deleted successfully', {
        categoryId: id,
        name: categoryInfo.name,
        userId: categoryInfo.user_id
      });
      
      return (deleteResult.rowCount || 0) > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to delete category', { error, categoryId: id });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Find categories by parent ID
   */
  async findByParentId(parentId: string | null, userId: string): Promise<QRCategory[]> {
    const client = await this.database.connect();
    
    try {
      let query = 'SELECT * FROM qr_categories WHERE user_id = $1';
      const values = [userId];
      
      if (parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ' AND parent_id = $2';
        values.push(parentId);
      }
      
      query += ' ORDER BY sort_order ASC, name ASC';
      
      const result = await client.query(query, values);
      
      return result.rows.map(row => this.mapRowToCategory(row));
      
    } catch (error) {
      this.logger.error('Failed to find categories by parent ID', { error, parentId, userId });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Move QR codes to category
   */
  async moveQRsToCategory(qrIds: string[], categoryId: string | null): Promise<number> {
    const client = await this.database.connect();
    
    try {
      const placeholders = qrIds.map((_, index) => `$${index + 1}`).join(',');
      const values = [...qrIds];
      
      let query = `UPDATE qr_codes SET category_id = `;
      
      if (categoryId === null) {
        query += 'NULL';
      } else {
        query += `$${values.length + 1}`;
        values.push(categoryId);
      }
      
      query += ` WHERE id IN (${placeholders})`;
      
      const result = await client.query(query, values);
      
      this.logger.info('QR codes moved to category', {
        qrCount: result.rowCount,
        categoryId,
        qrIds: qrIds.slice(0, 5) // Log first 5 IDs only
      });
      
      return result.rowCount || 0;
      
    } catch (error) {
      this.logger.error('Failed to move QR codes to category', { error, qrIds, categoryId });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Get categories with QR count
   */
  async getCategoryWithQRCount(userId: string): Promise<Array<QRCategory & { qrCount: number }>> {
    const client = await this.database.connect();
    
    try {
      const query = `
        SELECT 
          c.*,
          COALESCE(qr_counts.qr_count, 0) as qr_count
        FROM qr_categories c
        LEFT JOIN (
          SELECT 
            category_id,
            COUNT(*) as qr_count
          FROM qr_codes 
          WHERE category_id IS NOT NULL
          GROUP BY category_id
        ) qr_counts ON c.id = qr_counts.category_id
        WHERE c.user_id = $1
        ORDER BY c.sort_order ASC, c.name ASC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ({
        ...this.mapRowToCategory(row),
        qrCount: parseInt(row.qr_count) || 0
      }));
      
    } catch (error) {
      this.logger.error('Failed to get categories with QR count', { error, userId });
      throw new DatabaseError('Database operation failed');
      
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to QRCategory object
   */
  private mapRowToCategory(row: any): QRCategory {
    return {
      id: row.id,
      userId: row.user_id,
      parentId: row.parent_id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      isDefault: row.is_default,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}