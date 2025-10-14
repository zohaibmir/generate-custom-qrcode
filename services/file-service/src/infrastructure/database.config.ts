import { Pool, PoolClient } from 'pg';
import { ILogger } from '../interfaces';

export class DatabaseConfig {
  private pool: Pool;
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger;
    
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'qr_saas',
      user: process.env.DB_USER || 'qr_user',
      password: process.env.DB_PASSWORD || 'qr_password',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    });

    this.setupEventHandlers();
    
    if (this.logger) {
      this.logger.info('Database connection pool initialized', {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'qr_saas',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2')
      });
    }
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      if (this.logger) {
        this.logger.debug('New database client connected', {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        });
      }
    });

    this.pool.on('remove', (client: PoolClient) => {
      if (this.logger) {
        this.logger.debug('Database client removed from pool', {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount
        });
      }
    });

    this.pool.on('error', (err: Error) => {
      if (this.logger) {
        this.logger.error('Database pool error', { error: err });
      } else {
        console.error('Database pool error:', err);
      }
    });
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      if (this.logger) {
        this.logger.info('Database connection test successful');
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error('Database connection failed', { error });
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      if (this.logger) {
        this.logger.info('Database connection pool closed');
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error('Error closing database connection pool', { error });
      }
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  getPool(): Pool {
    return this.pool;
  }

  get totalCount(): number {
    return this.pool.totalCount;
  }

  get idleCount(): number {
    return this.pool.idleCount;
  }

  get waitingCount(): number {
    return this.pool.waitingCount;
  }
}