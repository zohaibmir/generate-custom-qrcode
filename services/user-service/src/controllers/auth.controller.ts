import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class AuthController {
  constructor(private userService: UserService) {}

  async register(req: Request, res: Response) {
    try {
      const result = await this.userService.register(req.body);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed'
        }
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await this.userService.login(req.body);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed'
        }
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    res.json({ message: 'Refresh token endpoint - to be implemented' });
  }

  async logout(req: Request, res: Response) {
    res.json({ message: 'Logout endpoint - to be implemented' });
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const result = await this.userService.forgotPassword(email);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Password reset failed'
        }
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      const result = await this.userService.resetPassword(token, password);
      
      if (!result.success) {
        return res.status(result.error?.statusCode || 500).json(result);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Password reset failed'
        }
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    res.json({ message: 'Email verification endpoint - to be implemented' });
  }
}