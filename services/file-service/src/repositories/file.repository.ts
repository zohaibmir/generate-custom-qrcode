import { Pool } from 'pg';
import { 
  FileUpload, 
  IFileRepository, 
  ILogger,
  DatabaseError,
  NotFoundError 
} from '../interfaces';

export class FileRepository implements IFileRepository {
  constructor(
    private database: Pool,
    private logger: ILogger
  ) {}

  async create(fileUpload: Omit<FileUpload, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileUpload> {
    try {
      const query = `
        INSERT INTO file_uploads (
          user_id, filename, original_name, mime_type, file_size, 
          file_path, upload_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        fileUpload.userId,
        fileUpload.filename,
        fileUpload.originalName,
        fileUpload.mimeType,
        fileUpload.fileSize,
        fileUpload.filePath,
        fileUpload.uploadType || 'general'
      ];

      const result = await this.database.query(query, values);
      const row = result.rows[0];

      const file: FileUpload = {
        id: row.id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        filePath: row.file_path,
        uploadType: row.upload_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.logger.info('File upload record created successfully', { 
        fileId: file.id,
        userId: file.userId,
        filename: file.filename
      });

      return file;

    } catch (error) {
      this.logger.error('Failed to create file upload record', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: fileUpload.userId,
        filename: fileUpload.filename
      });
      throw new DatabaseError('Failed to create file upload record');
    }
  }

  async findById(id: string): Promise<FileUpload | null> {
    try {
      const query = 'SELECT * FROM file_uploads WHERE id = $1';
      const result = await this.database.query(query, [id]);

      if (result.rows.length === 0) {
        this.logger.debug('File upload not found', { fileId: id });
        return null;
      }

      const row = result.rows[0];
      const file: FileUpload = {
        id: row.id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        filePath: row.file_path,
        uploadType: row.upload_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.logger.debug('File upload found', { fileId: id, userId: file.userId });
      return file;

    } catch (error) {
      this.logger.error('Failed to find file upload', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: id 
      });
      throw new DatabaseError('Failed to find file upload');
    }
  }

  async findByUserId(userId: string, options?: {
    uploadType?: string;
    mimeTypes?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: FileUpload[]; total: number }> {
    try {
      let query = 'SELECT * FROM file_uploads WHERE user_id = $1';
      let countQuery = 'SELECT COUNT(*) FROM file_uploads WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;

      // Add filters
      if (options?.uploadType) {
        query += ` AND upload_type = $${paramIndex}`;
        countQuery += ` AND upload_type = $${paramIndex}`;
        values.push(options.uploadType);
        paramIndex++;
      }

      if (options?.mimeTypes && options.mimeTypes.length > 0) {
        query += ` AND mime_type = ANY($${paramIndex})`;
        countQuery += ` AND mime_type = ANY($${paramIndex})`;
        values.push(options.mimeTypes);
        paramIndex++;
      }

      // Add sorting
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      if (options?.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options?.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
        paramIndex++;
      }

      // Execute queries
      const [filesResult, countResult] = await Promise.all([
        this.database.query(query, values),
        this.database.query(countQuery, values.slice(0, paramIndex - (options?.limit ? 1 : 0) - (options?.offset ? 1 : 0)))
      ]);

      const files: FileUpload[] = filesResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        filePath: row.file_path,
        uploadType: row.upload_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const total = parseInt(countResult.rows[0].count);

      this.logger.debug('Files retrieved for user', { 
        userId,
        fileCount: files.length,
        total,
        filters: options
      });

      return { files, total };

    } catch (error) {
      this.logger.error('Failed to find files by user', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw new DatabaseError('Failed to find files by user');
    }
  }

  async update(id: string, updates: Partial<FileUpload>): Promise<FileUpload | null> {
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbKey = key === 'userId' ? 'user_id' :
                       key === 'originalName' ? 'original_name' :
                       key === 'mimeType' ? 'mime_type' :
                       key === 'fileSize' ? 'file_size' :
                       key === 'filePath' ? 'file_path' :
                       key === 'uploadType' ? 'upload_type' :
                       key === 'updatedAt' ? 'updated_at' : key;
          
          setClause.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update the updated_at timestamp
      setClause.push(`updated_at = NOW()`);

      const query = `
        UPDATE file_uploads 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);

      const result = await this.database.query(query, values);

      if (result.rows.length === 0) {
        this.logger.warn('File upload not found for update', { fileId: id });
        return null;
      }

      const row = result.rows[0];
      const file: FileUpload = {
        id: row.id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        filePath: row.file_path,
        uploadType: row.upload_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.logger.info('File upload updated successfully', { 
        fileId: id,
        updatedFields: Object.keys(updates)
      });

      return file;

    } catch (error) {
      this.logger.error('Failed to update file upload', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: id 
      });
      throw new DatabaseError('Failed to update file upload');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM file_uploads WHERE id = $1';
      const result = await this.database.query(query, [id]);

      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        this.logger.info('File upload deleted successfully', { fileId: id });
      } else {
        this.logger.warn('File upload not found for deletion', { fileId: id });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete file upload', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: id 
      });
      throw new DatabaseError('Failed to delete file upload');
    }
  }

  async deleteByUserId(userId: string): Promise<number> {
    try {
      const query = 'DELETE FROM file_uploads WHERE user_id = $1';
      const result = await this.database.query(query, [userId]);

      const deletedCount = result.rowCount || 0;
      
      this.logger.info('User files deleted', { userId, deletedCount });
      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to delete user files', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw new DatabaseError('Failed to delete user files');
    }
  }

  async getStorageStats(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(file_size), 0) as total_size,
          upload_type,
          COUNT(*) as type_count,
          COALESCE(SUM(file_size), 0) as type_size
        FROM file_uploads
      `;
      const values: any[] = [];

      if (userId) {
        query += ' WHERE user_id = $1';
        values.push(userId);
      }

      query += ' GROUP BY upload_type';

      const result = await this.database.query(query, values);

      let totalFiles = 0;
      let totalSize = 0;
      const byType: Record<string, { count: number; size: number }> = {};

      result.rows.forEach(row => {
        const count = parseInt(row.type_count);
        const size = parseInt(row.type_size);
        
        totalFiles += count;
        totalSize += size;
        
        byType[row.upload_type] = {
          count,
          size
        };
      });

      this.logger.debug('Storage stats retrieved', { 
        userId: userId || 'all',
        totalFiles,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`
      });

      return { totalFiles, totalSize, byType };

    } catch (error) {
      this.logger.error('Failed to get storage stats', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId 
      });
      throw new DatabaseError('Failed to get storage stats');
    }
  }
}