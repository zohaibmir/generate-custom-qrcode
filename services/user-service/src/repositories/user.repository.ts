import { Pool, PoolClient } from 'pg';
import { 
  IUserRepository, 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  PaginationOptions,
  DatabaseError,
  NotFoundError,
  ValidationError,
  ILogger 
} from '../interfaces';

export class UserRepository implements IUserRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(userData: CreateUserRequest): Promise<User> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO users 
        (email, username, password_hash, full_name, subscription_tier, is_verified, avatar_url, preferences, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        userData.email,
        userData.username,
        userData.password, // Fixed: use password instead of passwordHash
        userData.fullName || null,
        userData.subscription || 'free', // Fixed: use subscription instead of subscriptionTier
        false, // isVerified defaults to false for new users
        null, // avatarUrl defaults to null for new users
        JSON.stringify({}), // preferences defaults to empty object
        JSON.stringify({}) // metadata defaults to empty object
      ];

      this.logger.debug('Creating user', { email: userData.email, username: userData.username });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new DatabaseError('Failed to create user - no data returned');
      }

      const user = this.mapRowToUser(result.rows[0]);
      this.logger.info('User created successfully', { userId: user.id, email: user.email });
      
      return user;
      
    } catch (error: any) {
      this.logger.error('Failed to create user', { 
        error: error.message,
        email: userData.email 
      });
      
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint?.includes('email')) {
          throw new ValidationError('Email already exists');
        }
        if (error.constraint?.includes('username')) {
          throw new ValidationError('Username already exists');
        }
      }
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<User | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error: any) {
      this.logger.error('Failed to find user by ID', { 
        error: error.message,
        userId: id 
      });
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error: any) {
      this.logger.error('Failed to find user by email', { 
        error: error.message,
        email 
      });
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await client.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error: any) {
      this.logger.error('Failed to find user by username', { 
        error: error.message,
        username 
      });
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findMany(pagination: PaginationOptions): Promise<{ users: User[]; total: number }> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      const sortOrder = pagination.sortOrder === 'desc' ? 'DESC' : 'ASC';
      const sortBy = pagination.sortBy || 'created_at';
      
      // Count total users
      const countQuery = 'SELECT COUNT(*) FROM users';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);
      
      // Fetch users with pagination
      const query = `
        SELECT * FROM users 
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;
      
      const result = await client.query(query, [pagination.limit, offset]);
      const users = result.rows.map(row => this.mapRowToUser(row));
      
      this.logger.debug('Retrieved users', { 
        count: users.length, 
        total, 
        page: pagination.page 
      });
      
      return { users, total };
      
    } catch (error: any) {
      this.logger.error('Failed to find users', { error: error.message });
      throw new DatabaseError(`Failed to find users: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async update(id: string, userData: UpdateUserRequest): Promise<User> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (userData.username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(userData.username);
      }
      
      if (userData.fullName !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(userData.fullName);
      }
      
      if (userData.avatar !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(userData.avatar);
      }
      
      if (userData.preferences !== undefined) {
        updates.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(userData.preferences));
      }

      if (updates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      this.logger.debug('Updating user', { userId: id, fields: Object.keys(userData) });
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const user = this.mapRowToUser(result.rows[0]);
      this.logger.info('User updated successfully', { userId: user.id });
      
      return user;
      
    } catch (error: any) {
      this.logger.error('Failed to update user', { 
        error: error.message,
        userId: id 
      });
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint?.includes('email')) {
          throw new ValidationError('Email already exists');
        }
        if (error.constraint?.includes('username')) {
          throw new ValidationError('Username already exists');
        }
      }
      
      throw new DatabaseError(`Failed to update user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('User not found');
      }

      this.logger.info('User deleted successfully', { userId: id });
      
    } catch (error: any) {
      this.logger.error('Failed to delete user', { 
        error: error.message,
        userId: id 
      });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError(`Failed to delete user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE metadata->>'emailVerificationToken' = $1
        AND metadata->>'emailVerificationExpiry' > $2
      `;
      const result = await client.query(query, [token, new Date().toISOString()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error: any) {
      this.logger.error('Failed to find user by email verification token', { 
        error: error.message 
      });
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE metadata->>'passwordResetToken' = $1
        AND metadata->>'passwordResetExpiry' > $2
      `;
      const result = await client.query(query, [token, new Date().toISOString()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
      
    } catch (error: any) {
      this.logger.error('Failed to find user by password reset token', { 
        error: error.message 
      });
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      client.release();
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      fullName: row.full_name,
      subscription: row.subscription_tier,
      isEmailVerified: row.is_verified,
      avatar: row.avatar_url,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}