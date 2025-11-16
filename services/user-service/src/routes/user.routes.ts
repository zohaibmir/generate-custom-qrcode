import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';

const router = Router();

// Apply auth context extraction for all user routes
router.use(ServiceAuthExtractor.createServiceMiddleware());

/**
 * User Routes
 * Protected routes that require authentication via API Gateway
 */

// User profile management
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// User CRUD operations (admin or self)
router.post('/', UserController.createUser);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

// User lookup operations
router.get('/email/:email', UserController.getUserByEmail);
router.get('/username/:username', UserController.getUserByUsername);

// User management operations
router.post('/:id/verify-email', UserController.verifyEmail);
router.post('/:id/change-password', UserController.changePassword);

export { router as userRoutes };