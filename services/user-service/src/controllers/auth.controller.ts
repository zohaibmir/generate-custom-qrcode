import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DatabaseConfig } from '../config/database.config';
import crypto from 'crypto';

/**
 * Authentication Controller
 * Handles user authentication operations following Clean Architecture principles
 */
export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !username || !password) {
        res.status(400).json({
          success: false,
          message: 'Email, username, and password are required'
        });
        return;
      }

      // Check if user already exists
      const pool = DatabaseConfig.getPool();
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
        `INSERT INTO users (email, username, password_hash, full_name, is_verified, created_at)
         VALUES ($1, $2, $3, $4, false, NOW())
         RETURNING id, email, username, full_name, created_at`,
        [email, username, hashedPassword, firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null)]
      );

      const user = newUser.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.full_name,
            createdAt: user.created_at
          }
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Find user
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, username, password_hash, full_name, is_verified FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET!,
        { 
          expiresIn: '7d',
          issuer: 'qr-saas-api-gateway'
        }
      );

      // Update last login
      await pool.query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.full_name,
            isVerified: user.is_verified
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }

  /**
   * Forgot password - send reset email
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      // Check if user exists
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email, full_name FROM users WHERE email = $1',
        [email]
      );

      // Always return success for security (don't reveal if email exists)
      if (userResult.rows.length === 0) {
        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent'
        });
        return;
      }

      const user = userResult.rows[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, user.id]
      );

      // Note: Email sending would be implemented here when email service is configured
      console.log(`Password reset token for ${user.email}: ${resetToken}`);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      next(error);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
        return;
      }

      // Find user with valid reset token
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );

      if (userResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
        return;
      }

      const user = userResult.rows[0];

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password and clear reset token
      await pool.query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        [hashedPassword, user.id]
      );

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      next(error);
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For now, refresh token functionality is not implemented
      // In a full implementation, you would validate refresh token and issue new access token
      res.status(501).json({
        success: false,
        message: 'Refresh token functionality not implemented yet'
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For JWT tokens, logout is usually handled client-side by removing the token
      // In a full implementation with refresh tokens, you might blacklist tokens
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      next(error);
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Find user with verification token
      const result = await pool.query(
        'UPDATE users SET is_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, email',
        [token]
      );

      if (result.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
        return;
      }

      const user = result.rows[0];

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          userId: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Verify email error:', error);
      next(error);
    }
  }
}