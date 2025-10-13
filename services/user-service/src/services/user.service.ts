import { IUserService, ServiceResponse, CreateUserRequest, LoginRequest, AuthResponse, User } from '@qr-saas/shared';
import { UserRepository } from '../repositories/user.repository';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '@qr-saas/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

export class UserService implements IUserService {
  constructor(private userRepository: UserRepository) {}

  async register(userData: CreateUserRequest): Promise<ServiceResponse<AuthResponse>> {
    try {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const user = await this.userRepository.create(userData);
      const tokens = this.generateTokens(user.id);

      return {
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: error instanceof ValidationError || error instanceof ConflictError ? 400 : 500
        }
      };
    }
  }

  async login(credentials: LoginRequest): Promise<ServiceResponse<AuthResponse>> {
    try {
      const userWithPassword = await this.userRepository.findByEmail(credentials.email);
      if (!userWithPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(credentials.password, userWithPassword.password_hash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const user = await this.userRepository.findById(userWithPassword.id);
      if (!user) {
        throw new NotFoundError('User');
      }

      const tokens = this.generateTokens(user.id);

      return {
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: error instanceof UnauthorizedError ? 401 : 500
        }
      };
    }
  }

  async getUserById(id: string): Promise<ServiceResponse<User>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: error instanceof NotFoundError ? 404 : 500
        }
      };
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ServiceResponse<User>> {
    try {
      const user = await this.userRepository.update(id, userData);
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: 500
        }
      };
    }
  }

  async deleteUser(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const deleted = await this.userRepository.delete(id);
      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: 500
        }
      };
    }
  }

  async forgotPassword(email: string): Promise<ServiceResponse<boolean>> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { success: true, data: true };
      }

      const resetToken = uuidv4();
      const expires = new Date(Date.now() + 3600000);
      
      await this.userRepository.setPasswordResetToken(email, resetToken, expires);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: 500
        }
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResponse<boolean>> {
    try {
      const success = await this.userRepository.resetPassword(token, newPassword);
      if (!success) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          statusCode: error instanceof UnauthorizedError ? 401 : 500
        }
      };
    }
  }

  private generateTokens(userId: string) {
    const payload = { userId, type: 'access' };
    const options = { expiresIn: config.jwt.accessTokenExpiry as any };
    
    const accessToken = jwt.sign(payload, config.jwt.secret, options);

    const refreshPayload = { userId, type: 'refresh' };
    const refreshOptions = { expiresIn: config.jwt.refreshTokenExpiry as any };
    
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, refreshOptions);

    return { accessToken, refreshToken };
  }
}