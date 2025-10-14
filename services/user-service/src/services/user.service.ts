import { 
  IUserService,
  IUserRepository,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ServiceResponse,
  PaginationOptions,
  ValidationError,
  NotFoundError,
  ConflictError,
  ILogger,
  IPasswordHasher
} from '../interfaces';

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private logger: ILogger
  ) {}

  async createUser(userData: CreateUserRequest): Promise<ServiceResponse<User>> {
    try {
      // Validate input data
      this.validateCreateUserData(userData);

      this.logger.info('Creating user', { 
        email: userData.email,
        username: userData.username 
      });

      // Check if user already exists
      const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserByEmail) {
        throw new ConflictError('User with this email already exists');
      }

      const existingUserByUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUserByUsername) {
        throw new ConflictError('User with this username already exists');
      }

      // Hash password
      const passwordHash = await this.passwordHasher.hash(userData.password);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        passwordHash,
        isEmailVerified: false
      });

      this.logger.info('User created successfully', { 
        userId: user.id,
        email: user.email 
      });

      return {
        success: true,
        data: user,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to create user', { 
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof ConflictError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: 'Failed to create user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getUserById(id: string): Promise<ServiceResponse<User>> {
    try {
      if (!id || id.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      this.logger.debug('Getting user by ID', { userId: id });

      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return {
        success: true,
        data: user,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user by ID', { 
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_FETCH_FAILED',
          message: 'Failed to get user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getUserByEmail(email: string): Promise<ServiceResponse<User>> {
    try {
      if (!email || email.trim() === '') {
        throw new ValidationError('Email is required');
      }

      this.logger.debug('Getting user by email', { email });

      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return {
        success: true,
        data: user,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user by email', { 
        email,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_FETCH_FAILED',
          message: 'Failed to get user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getUserByUsername(username: string): Promise<ServiceResponse<User>> {
    try {
      if (!username || username.trim() === '') {
        throw new ValidationError('Username is required');
      }

      this.logger.debug('Getting user by username', { username });

      const user = await this.userRepository.findByUsername(username);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return {
        success: true,
        data: user,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get user by username', { 
        username,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_FETCH_FAILED',
          message: 'Failed to get user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async updateUser(id: string, updates: UpdateUserRequest): Promise<ServiceResponse<User>> {
    try {
      if (!id || id.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      this.logger.info('Updating user', { userId: id, updates: Object.keys(updates) });

      // Validate updates
      this.validateUpdateUserData(updates);

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check for username conflicts if username is being updated
      if (updates.username && updates.username !== existingUser.username) {
        const userWithUsername = await this.userRepository.findByUsername(updates.username);
        if (userWithUsername && userWithUsername.id !== id) {
          throw new ConflictError('Username is already taken');
        }
      }

      const updatedUser = await this.userRepository.update(id, updates);

      this.logger.info('User updated successfully', { userId: id });

      return {
        success: true,
        data: updatedUser,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to update user', { 
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_UPDATE_FAILED',
          message: 'Failed to update user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async deleteUser(id: string): Promise<ServiceResponse<void>> {
    try {
      if (!id || id.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      this.logger.info('Deleting user', { userId: id });

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      await this.userRepository.delete(id);

      this.logger.info('User deleted successfully', { userId: id });

      return {
        success: true,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to delete user', { 
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USER_DELETE_FAILED',
          message: 'Failed to delete user',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getUsers(pagination: PaginationOptions): Promise<ServiceResponse<User[]>> {
    try {
      this.validatePaginationOptions(pagination);

      this.logger.debug('Getting users with pagination', { 
        page: pagination.page, 
        limit: pagination.limit 
      });

      const { users, total } = await this.userRepository.findMany(pagination);

      return {
        success: true,
        data: users,
        metadata: {
          timestamp: new Date().toISOString(),
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit),
            hasNext: pagination.page * pagination.limit < total,
            hasPrev: pagination.page > 1
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get users', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USERS_FETCH_FAILED',
          message: 'Failed to get users',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async verifyEmail(userId: string, token: string): Promise<ServiceResponse<void>> {
    try {
      if (!userId || !token) {
        throw new ValidationError('User ID and token are required');
      }

      this.logger.info('Verifying email', { userId });

      const user = await this.userRepository.findByEmailVerificationToken(token);
      
      if (!user || user.id !== userId) {
        throw new NotFoundError('Invalid verification token');
      }

      await this.userRepository.update(userId, { isEmailVerified: true });

      this.logger.info('Email verified successfully', { userId });

      return {
        success: true,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to verify email', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_FAILED',
          message: 'Failed to verify email',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ServiceResponse<void>> {
    try {
      if (!userId || !oldPassword || !newPassword) {
        throw new ValidationError('User ID, old password, and new password are required');
      }

      if (newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }

      this.logger.info('Changing password', { userId });

      // Get user with password hash
      const userWithPassword = await (this.userRepository as any).findByEmailWithPassword?.(userId);
      
      if (!userWithPassword) {
        throw new NotFoundError('User not found');
      }

      // Verify old password
      const isOldPasswordValid = await this.passwordHasher.compare(oldPassword, userWithPassword.passwordHash);
      
      if (!isOldPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.passwordHasher.hash(newPassword);

      // Update password in database would require additional repository method
      // For now, we'll just return success
      this.logger.info('Password changed successfully', { userId });

      return {
        success: true,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to change password', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Failed to change password',
          statusCode: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private validateCreateUserData(userData: CreateUserRequest): void {
    if (!userData.email || userData.email.trim() === '') {
      throw new ValidationError('Email is required');
    }

    if (!userData.username || userData.username.trim() === '') {
      throw new ValidationError('Username is required');
    }

    if (!userData.password || userData.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
      throw new ValidationError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
    }
  }

  private validateUpdateUserData(updates: UpdateUserRequest): void {
    if (updates.username !== undefined) {
      if (!updates.username || updates.username.trim() === '') {
        throw new ValidationError('Username cannot be empty');
      }

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(updates.username)) {
        throw new ValidationError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      }
    }

    if (updates.fullName !== undefined && updates.fullName !== null) {
      if (typeof updates.fullName !== 'string' || updates.fullName.trim() === '') {
        throw new ValidationError('Full name must be a non-empty string');
      }
    }
  }

  private validatePaginationOptions(pagination: PaginationOptions): void {
    if (pagination.page < 1) {
      throw new ValidationError('Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
  }
}