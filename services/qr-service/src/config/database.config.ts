import { Pool, PoolConfig } from 'pg';
import { ILogger } from '../interfaces';

export class DatabaseConfig {
  private static instance: Pool;
  private static logger: ILogger;

  public static initialize(logger: ILogger): Pool {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.logger = logger;
      
      let config: PoolConfig;
      
      // Try to use DATABASE_URL first (connection string format)
      if (process.env.DATABASE_URL) {
        config = {
          connectionString: process.env.DATABASE_URL,
          max: parseInt(process.env.DB_POOL_MAX || '20'),
          min: parseInt(process.env.DB_POOL_MIN || '5'),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
          connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
      } else {
        // Fallback to individual environment variables
        config = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'qr_saas',
          user: process.env.DB_USER || 'qr_user',
          password: process.env.DB_PASSWORD || 'qr_password',
          max: parseInt(process.env.DB_POOL_MAX || '20'),
          min: parseInt(process.env.DB_POOL_MIN || '5'),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
          connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
      }

      DatabaseConfig.instance = new Pool(config);

      // Connection event handlers
      DatabaseConfig.instance.on('connect', (client) => {
        DatabaseConfig.logger.info('Database connection established', {
          totalCount: DatabaseConfig.instance.totalCount,
          idleCount: DatabaseConfig.instance.idleCount,
          waitingCount: DatabaseConfig.instance.waitingCount
        });
      });

      DatabaseConfig.instance.on('error', (err) => {
        DatabaseConfig.logger.error('Database pool error', { error: err.message });
      });

      DatabaseConfig.instance.on('remove', () => {
        DatabaseConfig.logger.info('Database connection removed from pool');
      });

      DatabaseConfig.logger.info('Database connection pool initialized', {
        host: config.host,
        port: config.port,
        database: config.database,
        maxConnections: config.max
      });
    }

    return DatabaseConfig.instance;
  }

  public static async testConnection(): Promise<boolean> {
    try {
      const client = await DatabaseConfig.instance.connect();
      await client.query('SELECT NOW()');
      client.release();
      DatabaseConfig.logger.info('Database connection test successful');
      return true;
    } catch (error) {
      DatabaseConfig.logger.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  public static async close(): Promise<void> {
    if (DatabaseConfig.instance) {
      await DatabaseConfig.instance.end();
      DatabaseConfig.logger.info('Database connection pool closed');
    }
  }

  public static getPool(): Pool {
    if (!DatabaseConfig.instance) {
      throw new Error('Database not initialized. Call DatabaseConfig.initialize() first.');
    }
    return DatabaseConfig.instance;
  }
}