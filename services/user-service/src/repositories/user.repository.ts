import { Database } from '../infrastructure/database';
import { IUserRepository, User, CreateUserRequest } from '@qr-saas/shared';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository implements IUserRepository {
  constructor(private database: Database) {}

  async create(userData: CreateUserRequest): Promise<User> {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const query = `
      INSERT INTO users (id, email, password_hash, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, subscription_tier, is_email_verified, created_at, updated_at
    `;
    
    const result = await this.database.query(query, [
      id,
      userData.email.toLowerCase(),
      hashedPassword,
      userData.name
    ]);

    return this.mapRowToUser(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, subscription_tier, is_email_verified, created_at, updated_at
      FROM users WHERE id = $1
    `;
    
    const result = await this.database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<any | null> {
    const query = `
      SELECT id, email, password_hash, name, subscription_tier, is_email_verified, created_at, updated_at
      FROM users WHERE email = $1
    `;
    
    const result = await this.database.query(query, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (userData.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(userData.name);
    }

    if (userData.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(userData.email.toLowerCase());
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, subscription_tier, is_email_verified, created_at, updated_at
    `;

    const result = await this.database.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.database.query(query, [id]);
    return result.rowCount > 0;
  }

  async verifyEmail(id: string): Promise<void> {
    const query = `
      UPDATE users SET is_email_verified = true, email_verification_token = NULL
      WHERE id = $1
    `;
    await this.database.query(query, [id]);
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    const query = `
      UPDATE users SET password_reset_token = $1, password_reset_expires = $2
      WHERE email = $3
    `;
    await this.database.query(query, [token, expires, email.toLowerCase()]);
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE users SET 
        password_hash = $1, 
        password_reset_token = NULL, 
        password_reset_expires = NULL
      WHERE password_reset_token = $2 AND password_reset_expires > NOW()
    `;
    
    const result = await this.database.query(query, [hashedPassword, token]);
    return result.rowCount > 0;
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      subscriptionTier: row.subscription_tier,
      isEmailVerified: row.is_email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}