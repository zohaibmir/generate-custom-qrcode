import { promises as fs } from 'fs';
import path from 'path';
import { 
  IStorageProvider, 
  ILogger,
  StorageError 
} from '../interfaces';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(
    private logger: ILogger,
    baseDir?: string
  ) {
    this.baseDir = baseDir || process.env.FILE_STORAGE_PATH || './uploads';
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      this.logger.info('Storage directory initialized', { baseDir: this.baseDir });
    } catch (error) {
      this.logger.error('Failed to create storage directory', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        baseDir: this.baseDir
      });
      throw new StorageError('Failed to initialize storage directory');
    }
  }

  async uploadFile(key: string, buffer: Buffer, metadata: {
    mimeType: string;
    originalName: string;
    size: number;
  }): Promise<{ url: string; path: string }> {
    try {
      const filePath = path.join(this.baseDir, key);
      const directory = path.dirname(filePath);

      // Ensure subdirectory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);

      const url = `/files/${key}`;
      
      this.logger.info('File uploaded successfully', { 
        key,
        originalName: metadata.originalName,
        size: metadata.size,
        mimeType: metadata.mimeType,
        path: filePath
      });

      return { url, path: filePath };

    } catch (error) {
      this.logger.error('Failed to upload file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        originalName: metadata.originalName
      });
      throw new StorageError('Failed to upload file to storage');
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.baseDir, key);
      const buffer = await fs.readFile(filePath);

      this.logger.debug('File downloaded successfully', { 
        key,
        size: buffer.length
      });

      return buffer;

    } catch (error) {
      this.logger.error('Failed to download file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        key
      });
      
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new StorageError('File not found in storage');
      }
      
      throw new StorageError('Failed to download file from storage');
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.unlink(filePath);

      this.logger.info('File deleted successfully', { key });
      return true;

    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        this.logger.warn('File not found for deletion', { key });
        return false;
      }

      this.logger.error('Failed to delete file', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        key
      });
      throw new StorageError('Failed to delete file from storage');
    }
  }

  getFileUrl(key: string): string {
    return `/files/${key}`;
  }

  async generatePresignedUrl(key: string, operation: 'get' | 'put', expiresIn: number = 3600): Promise<string> {
    // For local storage, we'll return a simple URL with expiration token
    // In production, you'd use cloud storage presigned URLs
    const timestamp = Date.now();
    const expires = timestamp + (expiresIn * 1000);
    const token = Buffer.from(`${key}:${expires}`).toString('base64');
    
    if (operation === 'get') {
      return `/files/${key}?token=${token}&expires=${expires}`;
    } else {
      return `/upload/${key}?token=${token}&expires=${expires}`;
    }
  }

  // Utility methods for local storage
  async getFileStats(key: string): Promise<{ size: number; mtime: Date; exists: boolean }> {
    try {
      const filePath = path.join(this.baseDir, key);
      const stats = await fs.stat(filePath);
      
      return {
        size: stats.size,
        mtime: stats.mtime,
        exists: true
      };
    } catch (error) {
      return {
        size: 0,
        mtime: new Date(),
        exists: false
      };
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const searchDir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
      const files = await this.walkDirectory(searchDir);
      
      // Return relative paths from base directory
      return files.map(file => path.relative(this.baseDir, file));
    } catch (error) {
      this.logger.error('Failed to list files', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix
      });
      throw new StorageError('Failed to list files from storage');
    }
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.walkDirectory(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      return [];
    }
    
    return files;
  }
}