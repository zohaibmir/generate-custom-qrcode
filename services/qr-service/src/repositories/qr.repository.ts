import { Pool, PoolClient } from 'pg';
import { 
  IQRRepository, 
  QRCode, 
  CreateQRRequest, 
  PaginationOptions,
  DatabaseError,
  NotFoundError,
  ILogger 
} from '../interfaces';

export class QRRepository implements IQRRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(qrData: any): Promise<QRCode> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO qr_codes 
        (user_id, short_id, name, type, content, design_config, target_url, expires_at, max_scans, password_hash, valid_schedule, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      // Prepare content as JSONB - always create a JSON object
      const contentData = qrData.content || qrData.data;
      const content = JSON.stringify({
        data: contentData,
        description: qrData.description || null
      });
      
      const values = [
        qrData.userId,
        qrData.shortId,
        qrData.name || qrData.title || 'Untitled QR Code',
        qrData.type,
        content,
        JSON.stringify(qrData.designConfig || qrData.customization || {}),
        qrData.targetUrl,
        qrData.validityConfig?.expiresAt || null,
        qrData.validityConfig?.maxScans || null,
        qrData.validityConfig?.passwordHash || null,
        qrData.validityConfig?.validSchedule ? JSON.stringify(qrData.validityConfig.validSchedule) : null,
        qrData.isActive !== undefined ? qrData.isActive : true
      ];

      this.logger.debug('Creating QR code', { userId: qrData.userId, shortId: qrData.shortId });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new DatabaseError('Failed to create QR code - no data returned');
      }

      const qrCode = this.mapRowToQRCode(result.rows[0]);
      
      this.logger.info('QR code created successfully', { 
        qrId: qrCode.id, 
        userId: qrCode.userId,
        type: qrCode.type 
      });
      
      return qrCode;
      
    } catch (error) {
      this.logger.error('Failed to create QR code', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: qrData.userId 
      });
      
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        'Failed to create QR code',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<QRCode | null> {
    try {
      const query = 'SELECT * FROM qr_codes WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      this.logger.debug('QR code lookup by ID', { qrId: id, found: result.rows.length > 0 });
      
      return result.rows.length > 0 ? this.mapRowToQRCode(result.rows[0]) : null;
      
    } catch (error) {
      this.logger.error('Failed to find QR code by ID', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new DatabaseError(
        'Failed to retrieve QR code',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    }
  }

  async findByShortId(shortId: string): Promise<QRCode | null> {
    try {
      const query = 'SELECT * FROM qr_codes WHERE short_id = $1';
      const result = await this.db.query(query, [shortId]);
      
      this.logger.debug('QR code lookup by short ID', { shortId, found: result.rows.length > 0 });
      
      return result.rows.length > 0 ? this.mapRowToQRCode(result.rows[0]) : null;
      
    } catch (error) {
      this.logger.error('Failed to find QR code by short ID', { 
        shortId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new DatabaseError(
        'Failed to retrieve QR code',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    }
  }

  async findByUserId(userId: string, pagination?: PaginationOptions): Promise<QRCode[]> {
    try {
      const limit = Math.min(pagination?.limit || 20, 100); // Max 100 items per page
      const offset = ((pagination?.page || 1) - 1) * limit;
      
      const query = `
        SELECT * FROM qr_codes 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [userId, limit, offset]);
      
      this.logger.debug('QR codes lookup by user ID', { 
        userId, 
        count: result.rows.length,
        limit,
        offset 
      });
      
      return result.rows.map(row => this.mapRowToQRCode(row));
      
    } catch (error) {
      this.logger.error('Failed to find QR codes by user ID', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new DatabaseError(
        'Failed to retrieve user QR codes',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    }
  }

  async update(id: string, qrData: any): Promise<QRCode> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE qr_codes 
        SET name = COALESCE($2, name), 
            content = COALESCE($3, content), 
            design_config = COALESCE($4, design_config), 
            expires_at = COALESCE($5, expires_at),
            max_scans = COALESCE($6, max_scans), 
            is_active = COALESCE($7, is_active), 
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [
        id,
        qrData.title || qrData.name || null,
        qrData.data ? JSON.stringify(qrData.data) : null,
        qrData.customization ? JSON.stringify(qrData.customization) : null,
        qrData.validityConfig?.expiresAt || null,
        qrData.validityConfig?.maxScans || null,
        qrData.isActive !== undefined ? qrData.isActive : null
      ];

      this.logger.debug('Updating QR code', { qrId: id });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new NotFoundError('QR Code');
      }

      const updatedQR = this.mapRowToQRCode(result.rows[0]);
      
      this.logger.info('QR code updated successfully', { qrId: id });
      
      return updatedQR;
      
    } catch (error) {
      this.logger.error('Failed to update QR code', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError(
        'Failed to update QR code',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM qr_codes WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      const deleted = (result.rowCount || 0) > 0;
      
      this.logger.debug('QR code deletion', { qrId: id, deleted });
      
      return deleted;
      
    } catch (error) {
      this.logger.error('Failed to delete QR code', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new DatabaseError(
        'Failed to delete QR code',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    }
  }

  async incrementScanCount(id: string): Promise<void> {
    try {
      const query = 'UPDATE qr_codes SET current_scans = current_scans + 1, updated_at = NOW() WHERE id = $1';
      await this.db.query(query, [id]);
      
      this.logger.debug('QR code scan count incremented', { qrId: id });
      
    } catch (error) {
      this.logger.error('Failed to increment QR code scan count', { 
        qrId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new DatabaseError(
        'Failed to update scan count',
        error instanceof Error ? error.message : 'Unknown database error'
      );
    }
  }

  private mapRowToQRCode(row: any): QRCode {
    return {
      id: row.id,
      userId: row.user_id,
      shortId: row.short_id,
      name: row.name,
      type: row.type,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      designConfig: typeof row.design_config === 'string' ? JSON.parse(row.design_config) : row.design_config,
      targetUrl: row.target_url,
      isActive: row.is_active,
      validityConfig: {
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        maxScans: row.max_scans,
        passwordHash: row.password_hash,
        validSchedule: row.valid_schedule ? JSON.parse(row.valid_schedule) : undefined
      },
      currentScans: row.current_scans || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}