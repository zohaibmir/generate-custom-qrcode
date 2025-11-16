import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { DatabaseConfig } from '../config/database.config';

/**
 * User Controller
 * Handles user management operations following Clean Architecture principles
 * Expects authentication context from ServiceAuthExtractor middleware
 */
export class UserController {
  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, username, full_name, subscription_tier, is_verified, avatar_url, preferences, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          avatarUrl: user.avatar_url,
          preferences: user.preferences,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      const { fullName, avatarUrl, preferences } = req.body;

      const pool = DatabaseConfig.getPool();
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (fullName !== undefined) {
        updateFields.push(`full_name = $${paramCount}`);
        values.push(fullName);
        paramCount++;
      }

      if (avatarUrl !== undefined) {
        updateFields.push(`avatar_url = $${paramCount}`);
        values.push(avatarUrl);
        paramCount++;
      }

      if (preferences !== undefined) {
        updateFields.push(`preferences = $${paramCount}`);
        values.push(JSON.stringify(preferences));
        paramCount++;
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
        return;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, username, full_name, subscription_tier, is_verified, avatar_url, preferences, updated_at
      `;

      const result = await pool.query(query, values);
      const user = result.rows[0];

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          avatarUrl: user.avatar_url,
          preferences: user.preferences,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      next(error);
    }
  }

  /**
   * Get user by ID (admin or self only)
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId: currentUserId } = (req as any).auth;
      const { id } = req.params;

      // Allow users to get their own data
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, username, full_name, subscription_tier, is_verified, avatar_url, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Basic access control - users can only see their own data unless admin
      if (currentUserId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      next(error);
    }
  }

  /**
   * Create new user (admin only or registration endpoint)
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password, fullName } = req.body;

      if (!email || !username || !password) {
        res.status(400).json({
          success: false,
          message: 'Email, username, and password are required'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await pool.query(
        `INSERT INTO users (email, username, password_hash, full_name, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, email, username, full_name, subscription_tier, created_at`,
        [email, username, hashedPassword, fullName || null]
      );

      const user = newUser.rows[0];

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      next(error);
    }
  }

  /**
   * Update user (admin or self only)
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId: currentUserId } = (req as any).auth;
      const { id } = req.params;
      const { fullName, avatarUrl, preferences } = req.body;

      // Basic access control
      if (currentUserId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Build dynamic update query (same as updateProfile)
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (fullName !== undefined) {
        updateFields.push(`full_name = $${paramCount}`);
        values.push(fullName);
        paramCount++;
      }

      if (avatarUrl !== undefined) {
        updateFields.push(`avatar_url = $${paramCount}`);
        values.push(avatarUrl);
        paramCount++;
      }

      if (preferences !== undefined) {
        updateFields.push(`preferences = $${paramCount}`);
        values.push(JSON.stringify(preferences));
        paramCount++;
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
        return;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, username, full_name, subscription_tier, is_verified, avatar_url, preferences, updated_at
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = result.rows[0];

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          avatarUrl: user.avatar_url,
          preferences: user.preferences,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      next(error);
    }
  }

  /**
   * Delete user (admin or self only)
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId: currentUserId } = (req as any).auth;
      const { id } = req.params;

      // Basic access control
      if (currentUserId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      next(error);
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;
      const { userId: currentUserId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, username, full_name, subscription_tier, is_verified, created_at FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Basic access control - users can only lookup their own email
      if (currentUserId !== user.id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Get user by email error:', error);
      next(error);
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const { userId: currentUserId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, username, full_name, subscription_tier, is_verified, created_at FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Basic access control - users can only lookup their own username
      if (currentUserId !== user.id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          isVerified: user.is_verified,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Get user by username error:', error);
      next(error);
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: currentUserId } = (req as any).auth;
      const { token } = req.body;

      // Basic access control
      if (currentUserId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Verify the email verification token if provided
      if (token) {
        const result = await pool.query(
          'UPDATE users SET is_verified = true, email_verification_token = NULL WHERE id = $1 AND email_verification_token = $2 RETURNING id',
          [id, token]
        );

        if (result.rows.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Invalid verification token'
          });
          return;
        }
      } else {
        // Direct verification (admin action)
        const result = await pool.query(
          'UPDATE users SET is_verified = true WHERE id = $1 RETURNING id',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'User not found'
          });
          return;
        }
      }

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      console.error('Verify email error:', error);
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: currentUserId } = (req as any).auth;
      const { currentPassword, newPassword } = req.body;

      // Basic access control
      if (currentUserId !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Get current password hash
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, id]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      next(error);
    }
  }
}