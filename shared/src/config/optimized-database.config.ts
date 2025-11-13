import { Pool, PoolConfig } from 'pg';

interface ILogger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

type ServiceConfigKey = 'analytics-service' | 'user-service' | 'qr-service' | 'default';

export class OptimizedDatabaseConfig {
  private static pool: Pool;
  private static logger: ILogger;
  private static connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    totalQueries: 0,
    slowQueries: 0,
    errors: 0
  };

  static initialize(logger: ILogger, serviceName?: string): Pool {
    this.logger = logger;

    // Service-specific optimized pool configurations for high traffic
    const serviceConfigs = {
      'analytics-service': {
        max: parseInt(process.env.DB_POOL_MAX || '50'),  // High read load
        min: parseInt(process.env.DB_POOL_MIN || '10'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '25000')
      },
      'user-service': {
        max: parseInt(process.env.DB_POOL_MAX || '30'),  // Moderate read/write
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '45000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '12000'),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '20000'),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '15000')
      },
      'qr-service': {
        max: parseInt(process.env.DB_POOL_MAX || '40'),  // High write load
        min: parseInt(process.env.DB_POOL_MIN || '8'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '45000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '12000'),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '20000'),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '15000')
      },
      'default': {
        max: parseInt(process.env.DB_POOL_MAX || '25'),  // Standard load
        min: parseInt(process.env.DB_POOL_MIN || '3'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '45000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '12000'),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '20000'),
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '15000')
      }
    };

    const serviceConfig = serviceConfigs[serviceName as ServiceConfigKey] || serviceConfigs.default;

    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'qr_saas',
      user: process.env.DB_USER || 'qr_user',
      password: process.env.DB_PASSWORD || 'qr_password',
      
      // Optimized connection pool settings
      max: serviceConfig.max,
      min: serviceConfig.min,
      idleTimeoutMillis: serviceConfig.idleTimeoutMillis,
      connectionTimeoutMillis: serviceConfig.connectionTimeoutMillis,
      
      // Additional optimization settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
      
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false,
        requestCert: true 
      } : false,

      // Query timeout settings
      statement_timeout: serviceConfig.statementTimeout,
      query_timeout: serviceConfig.queryTimeout,

      // Connection validation
      allowExitOnIdle: false,
      
      // Performance options
      options: [
        `--application_name=${serviceName || 'qr-saas-service'}`,
        `--statement_timeout=${serviceConfig.statementTimeout}ms`,
        `--lock_timeout=10000ms`,
        `--idle_in_transaction_session_timeout=60000ms`
      ].join(' ')
    };

    this.pool = new Pool(config);

    // Enhanced event handlers with metrics
    this.pool.on('connect', (client) => {
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.activeConnections++;
      
      this.logger.info('New database client connected', {
        serviceName,
        connectionMetrics: this.connectionMetrics,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      });

      // Set session-level optimizations
      client.query(`
        SET statement_timeout = '${serviceConfig.statementTimeout}ms';
        SET lock_timeout = '10000ms';
        SET idle_in_transaction_session_timeout = '60000ms';
      `).catch(err => {
        this.logger.warn('Failed to set session parameters', { error: err.message });
      });
    });

    this.pool.on('error', (err) => {
      this.connectionMetrics.errors++;
      
      this.logger.error('Database pool error', { 
        serviceName,
        error: err.message,
        stack: err.stack,
        connectionMetrics: this.connectionMetrics,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      });
    });

    this.pool.on('remove', (client) => {
      this.connectionMetrics.activeConnections--;
      
      this.logger.debug('Database client removed from pool', {
        serviceName,
        connectionMetrics: this.connectionMetrics,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      });
    });

    this.pool.on('acquire', (client) => {
      this.connectionMetrics.idleConnections--;
      this.logger.debug('Database client acquired from pool', {
        serviceName,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      });
    });

    this.pool.on('release', (client) => {
      this.connectionMetrics.idleConnections++;
      this.logger.debug('Database client released to pool', {
        serviceName,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      });
    });

    // Log optimized configuration
    this.logger.info('Optimized database connection pool initialized', {
      serviceName,
      host: config.host,
      port: config.port,
      database: config.database,
      poolConfig: {
        maxConnections: config.max,
        minConnections: config.min,
        idleTimeout: config.idleTimeoutMillis,
        connectionTimeout: config.connectionTimeoutMillis,
        statementTimeout: serviceConfig.statementTimeout,
        queryTimeout: serviceConfig.queryTimeout
      }
    });

    // Start metrics collection interval
    this.startMetricsCollection();

    return this.pool;
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call OptimizedDatabaseConfig.initialize() first.');
    }
    return this.pool;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const client = await this.pool.connect();
      
      // Test with an actual query to verify performance
      await client.query('SELECT NOW(), pg_database_size(current_database()) as db_size');
      
      const duration = Date.now() - startTime;
      client.release();
      
      this.logger.info('Database connection test successful', {
        duration,
        poolStats: this.getConnectionInfo()
      });
      
      // Alert if connection is slow
      if (duration > 5000) {
        this.logger.warn('Database connection is slower than expected', { duration });
      }
      
      return true;
    } catch (error) {
      this.logger.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        poolStats: this.getConnectionInfo()
      });
      return false;
    }
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection pool closed', {
        finalMetrics: this.connectionMetrics
      });
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
      status: 'initialized',
      metrics: this.connectionMetrics,
      utilization: {
        percentage: Math.round((this.pool.totalCount / (this.pool.options?.max || 20)) * 100),
        level: this.getUtilizationLevel()
      }
    };
  }

  private static getUtilizationLevel(): string {
    const utilisationPercentage = (this.pool.totalCount / (this.pool.options?.max || 20)) * 100;
    if (utilisationPercentage >= 90) return 'HIGH';
    if (utilisationPercentage >= 70) return 'MODERATE';
    if (utilisationPercentage >= 50) return 'NORMAL';
    return 'LOW';
  }

  static async getPoolHealth(): Promise<any> {
    try {
      const client = await this.pool.connect();
      
      // Query pool health metrics
      const healthQuery = `
        SELECT 
          COUNT(*) as total_connections,
          COUNT(*) FILTER (WHERE state = 'active') as active_connections,
          COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
          COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          COUNT(*) FILTER (WHERE wait_event_type = 'Lock') as waiting_on_locks,
          AVG(EXTRACT(EPOCH FROM (NOW() - state_change))) as avg_connection_age_seconds
        FROM pg_stat_activity 
        WHERE datname = current_database()
        AND backend_type = 'client backend'
      `;
      
      const result = await client.query(healthQuery);
      client.release();
      
      const health = result.rows[0];
      const poolInfo = this.getConnectionInfo();
      
      // Determine health status
      const healthStatus = this.determineHealthStatus(health, poolInfo);
      
      return {
        status: healthStatus.status,
        message: healthStatus.message,
        recommendations: healthStatus.recommendations,
        metrics: {
          database: health,
          pool: poolInfo,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.logger.error('Failed to get pool health', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        status: 'ERROR',
        message: 'Failed to retrieve pool health metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static determineHealthStatus(dbHealth: any, poolInfo: any): {
    status: string;
    message: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let status = 'HEALTHY';
    let message = 'Connection pool is operating normally';

    // Check utilization
    if (poolInfo.utilization.percentage >= 90) {
      status = 'CRITICAL';
      message = 'Connection pool near capacity';
      recommendations.push('Increase max_connections or optimize connection usage');
    } else if (poolInfo.utilization.percentage >= 75) {
      status = 'WARNING';
      message = 'High connection pool usage';
      recommendations.push('Monitor closely, consider pool optimization');
    }

    // Check idle in transaction
    if (parseInt(dbHealth.idle_in_transaction) >= 10) {
      status = status === 'HEALTHY' ? 'WARNING' : status;
      recommendations.push('High number of idle transactions detected - review transaction handling');
    }

    // Check lock waits
    if (parseInt(dbHealth.waiting_on_locks) >= 5) {
      status = status === 'HEALTHY' ? 'WARNING' : status;
      recommendations.push('High lock contention detected - consider query optimization');
    }

    // Check connection age
    if (parseFloat(dbHealth.avg_connection_age_seconds) > 3600) {
      recommendations.push('Long-lived connections detected - consider connection recycling');
    }

    return { status, message, recommendations };
  }

  private static startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        const health = await this.getPoolHealth();
        
        if (health.status === 'CRITICAL' || health.status === 'WARNING') {
          this.logger.warn('Connection pool health alert', {
            status: health.status,
            message: health.message,
            recommendations: health.recommendations,
            metrics: health.metrics
          });
        }
        
        // Update internal metrics
        if (health.metrics?.database) {
          this.connectionMetrics.activeConnections = parseInt(health.metrics.database.active_connections) || 0;
          this.connectionMetrics.idleConnections = parseInt(health.metrics.database.idle_connections) || 0;
        }
        
      } catch (error) {
        this.logger.error('Failed to collect pool metrics', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }, 30000);
  }

  // Query wrapper with performance monitoring
  static async query(text: string, params?: any[], timeout?: number): Promise<any> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      this.connectionMetrics.totalQueries++;
      
      // Set query timeout if specified
      if (timeout) {
        await client.query(`SET statement_timeout = '${timeout}ms'`);
      }
      
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        this.connectionMetrics.slowQueries++;
        this.logger.warn('Slow query detected', {
          duration,
          query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          params: params ? params.length : 0
        });
      }
      
      return result;
      
    } catch (error) {
      this.connectionMetrics.errors++;
      
      this.logger.error('Database query error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        params: params ? params.length : 0,
        duration: Date.now() - startTime
      });
      
      throw error;
      
    } finally {
      // Reset query timeout
      if (timeout) {
        await client.query('RESET statement_timeout').catch(() => {});
      }
      client.release();
    }
  }

  // Get connection pool metrics for monitoring
  static getMetrics(): any {
    return {
      ...this.connectionMetrics,
      poolInfo: this.getConnectionInfo(),
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics (useful for monitoring intervals)
  static resetMetrics(): void {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: this.connectionMetrics.activeConnections, // Keep current active count
      idleConnections: this.connectionMetrics.idleConnections,     // Keep current idle count  
      totalQueries: 0,
      slowQueries: 0,
      errors: 0
    };
  }
}