import { Database as RealDatabase } from './database';
import { logger } from '../utils/logger';

export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    // Initialize with empty tables
    this.data.set('users', []);
    logger.info('Mock Database initialized');
  }

  async connect(): Promise<void> {
    logger.info('Mock Database connected successfully');
  }

  async query(text: string, params?: any[]): Promise<any> {
    // Simple mock implementation for testing
    const normalizedQuery = text.toLowerCase().trim();
    
    if (normalizedQuery.includes('insert into users')) {
      const users = this.data.get('users') || [];
      const newUser = {
        id: `user_${Date.now()}`,
        name: params?.[0] || 'Test User',
        email: params?.[1] || 'test@example.com',
        password: params?.[2] || 'hashedpassword',
        created_at: new Date(),
        updated_at: new Date()
      };
      users.push(newUser);
      this.data.set('users', users);
      return { rows: [newUser], rowCount: 1 };
    }
    
    if (normalizedQuery.includes('select') && normalizedQuery.includes('users')) {
      const users = this.data.get('users') || [];
      if (normalizedQuery.includes('where email')) {
        const email = params?.[0];
        const user = users.find(u => u.email === email);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      return { rows: users, rowCount: users.length };
    }
    
    if (normalizedQuery.includes('update users')) {
      const users = this.data.get('users') || [];
      // Simple update logic - return success
      return { rows: [], rowCount: 1 };
    }
    
    if (normalizedQuery.includes('delete from users')) {
      const users = this.data.get('users') || [];
      // Simple delete logic
      return { rows: [], rowCount: 1 };
    }
    
    // Default return for unsupported queries
    return { rows: [], rowCount: 0 };
  }

  async disconnect(): Promise<void> {
    logger.info('Mock Database disconnected');
  }
}

// Export based on environment or testing flag
const USE_MOCK_DB = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;
export const Database = USE_MOCK_DB ? MockDatabase : RealDatabase;