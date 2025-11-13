import { Pool, PoolConfig } from 'pg';
import config from './config';

class DatabaseConfig {
  private static pool: Pool | null = null;

  public static getPool(): Pool {
    if (!this.pool) {
      const poolConfig: PoolConfig = {
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.username,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(poolConfig);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });

      this.pool.on('connect', () => {
        console.log('✅ SSO Service connected to PostgreSQL database');
      });
    }

    return this.pool;
  }

  public static async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 SSO Service database connection closed');
    }
  }
}

export default DatabaseConfig;