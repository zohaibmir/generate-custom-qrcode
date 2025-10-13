import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApiResponse } from '@qr-saas/shared';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';
import { Database } from './infrastructure/database';
import { errorHandler } from './middleware/error.middleware';

dotenv.config({ path: '../../.env' });

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize dependencies using dependency injection
const database = new Database();
const userRepository = new UserRepository(database);
const userService = new UserService(userRepository);
const authController = new AuthController(userService);
const userController = new UserController(userService);

app.get('/health', (req, res) => {
  const response: ApiResponse<{ status: string; service: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString()
    }
  };
  res.json(response);
});

// Auth routes
app.post('/auth/register', (req, res) => authController.register(req, res));
app.post('/auth/login', (req, res) => authController.login(req, res));
app.post('/auth/refresh', (req, res) => authController.refreshToken(req, res));
app.post('/auth/logout', (req, res) => authController.logout(req, res));
app.post('/auth/forgot-password', (req, res) => authController.forgotPassword(req, res));
app.post('/auth/reset-password', (req, res) => authController.resetPassword(req, res));
app.post('/auth/verify-email', (req, res) => authController.verifyEmail(req, res));

// User routes (temporary test routes - auth middleware needed)
app.get('/users/profile', (req, res) => userController.getProfile(req, res));
app.put('/users/profile', (req, res) => userController.updateProfile(req, res));
app.delete('/users/account', (req, res) => userController.deleteAccount(req, res));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});