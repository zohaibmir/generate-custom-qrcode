import { Pool, PoolConfig } from 'pg';
import { ILogger } from '../interfaces';

export class DatabaseConfig {
  private static pool: Pool;
  private static logger: ILogger;

  static initialize(logger: ILogger): Pool {
    this.logger = logger;

    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'qr_saas',
      user: process.env.DB_USER || 'qr_user',
      password: process.env.DB_PASSWORD || 'qr_password',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    this.pool = new Pool(config);

    // Event handlers
    this.pool.on('connect', (client) => {
      this.logger.debug('New database client connected', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('error', (err) => {
      this.logger.error('Database pool error', { 
        error: err.message,
        stack: err.stack 
      });
    });

    this.pool.on('remove', () => {
      this.logger.debug('Database client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      });
    });

    this.logger.info('Database connection pool initialized', {
      host: config.host,
      port: config.port,
      database: config.database,
      maxConnections: config.max,
      minConnections: config.min
    });

    return this.pool;
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call DatabaseConfig.initialize() first.');
    }
    return this.pool;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.logger.info('Database connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    }
  }

  static getConnectionInfo(): any {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      status: 'initialized'
    };
  }
}