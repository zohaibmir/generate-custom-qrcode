import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const result = await this.userService.getUserById(userId);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user profile'
        }
      });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const result = await this.userService.updateUser(userId, req.body);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user profile'
        }
      });
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const result = await this.userService.deleteUser(userId);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user account'
        }
      });
    }
  }
}