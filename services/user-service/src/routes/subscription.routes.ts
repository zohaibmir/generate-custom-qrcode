import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { ServiceAuthExtractor } from '@qr-saas/shared';

const router = Router();

// Apply auth context extraction for all subscription routes
router.use(ServiceAuthExtractor.createServiceMiddleware());

/**
 * Subscription Routes
 * Protected routes that require authentication via API Gateway
 */

// Current user subscription management
router.get('/current', SubscriptionController.getCurrentSubscription);
router.post('/subscribe/:planId', SubscriptionController.subscribe);
router.post('/cancel', SubscriptionController.cancelSubscription);
router.post('/upgrade/:planId', SubscriptionController.upgradeSubscription);
router.post('/downgrade/:planId', SubscriptionController.downgradeSubscription);

// Subscription plans
router.get('/plans', SubscriptionController.getPlans);
router.get('/plans/:id', SubscriptionController.getPlanById);

// Subscription history and usage
router.get('/history', SubscriptionController.getSubscriptionHistory);
router.get('/usage', SubscriptionController.getUsage);
router.get('/limits', SubscriptionController.getLimits);

// Administrative subscription operations (admin only)
router.get('/admin/all', SubscriptionController.getAllSubscriptions);
router.get('/admin/user/:userId', SubscriptionController.getUserSubscription);
router.post('/admin/user/:userId/override', SubscriptionController.overrideSubscription);

export { router as subscriptionRoutes };