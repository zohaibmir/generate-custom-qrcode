import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

/**
 * Authentication Routes
 * Public routes that don't require authentication
 */

// User registration
router.post('/register', AuthController.register);

// User login
router.post('/login', AuthController.login);

// Forgot password
router.post('/forgot-password', AuthController.forgotPassword);

// Reset password
router.post('/reset-password', AuthController.resetPassword);

// Refresh token
router.post('/refresh-token', AuthController.refreshToken);

// Logout
router.post('/logout', AuthController.logout);

// Email verification
router.get('/verify-email/:token', AuthController.verifyEmail);

export { router as authRoutes };