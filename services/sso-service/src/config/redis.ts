import Redis from 'redis';
import config from './config';

class RedisConfig {
  private static client: Redis.RedisClientType | null = null;

  public static async getClient(): Promise<Redis.RedisClientType> {
    if (!this.client) {
      this.client = Redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ SSO Service connected to Redis');
      });

      await this.client.connect();
    }

    return this.client;
  }

  public static async closeClient(): Promise<void> {
    if (this.client && this.client.isReady) {
      await this.client.quit();
      this.client = null;
      console.log('🔌 SSO Service Redis connection closed');
    }
  }
}

export default RedisConfig;