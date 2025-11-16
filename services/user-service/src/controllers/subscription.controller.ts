import { Request, Response, NextFunction } from 'express';
import { DatabaseConfig } from '../config/database.config';

/**
 * Subscription Controller
 * Handles subscription management operations following Clean Architecture principles
 * Expects authentication context from ServiceAuthExtractor middleware
 */
export class SubscriptionController {
  /**
   * Get current user's subscription
   */
  static async getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      
      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT subscription_tier, created_at FROM users WHERE id = $1',
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
          tier: user.subscription_tier,
          subscribedAt: user.created_at,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Get current subscription error:', error);
      next(error);
    }
  }

  /**
   * Subscribe to a plan
   */
  static async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      const { planId } = req.params;

      // Validate plan
      const validPlans = ['free', 'starter', 'professional', 'enterprise'];
      if (!validPlans.includes(planId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Update user subscription
      const result = await pool.query(
        'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2 RETURNING subscription_tier',
        [planId, userId]
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
        message: `Successfully subscribed to ${planId} plan`,
        data: {
          tier: result.rows[0].subscription_tier,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      next(error);
    }
  }

  /**
   * Cancel subscription (downgrade to free)
   */
  static async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      
      const result = await pool.query(
        'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2 RETURNING subscription_tier',
        ['free', userId]
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
        message: 'Subscription cancelled successfully',
        data: {
          tier: result.rows[0].subscription_tier,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      next(error);
    }
  }

  /**
   * Upgrade subscription
   */
  static async upgradeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      const { planId } = req.params;

      // Plan hierarchy for validation
      const planHierarchy = {
        'free': 0,
        'starter': 1,
        'professional': 2,
        'enterprise': 3
      };

      if (!planHierarchy.hasOwnProperty(planId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Get current plan
      const currentUser = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (currentUser.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const currentPlan = currentUser.rows[0].subscription_tier;
      
      // Validate upgrade
      if ((planHierarchy as any)[planId] <= (planHierarchy as any)[currentPlan]) {
        res.status(400).json({
          success: false,
          message: 'Cannot upgrade to a lower or same tier plan'
        });
        return;
      }

      // Update subscription
      const result = await pool.query(
        'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2 RETURNING subscription_tier',
        [planId, userId]
      );

      res.json({
        success: true,
        message: `Successfully upgraded to ${planId} plan`,
        data: {
          previousTier: currentPlan,
          currentTier: result.rows[0].subscription_tier,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      next(error);
    }
  }

  /**
   * Downgrade subscription
   */
  static async downgradeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;
      const { planId } = req.params;

      // Plan hierarchy for validation
      const planHierarchy = {
        'free': 0,
        'starter': 1,
        'professional': 2,
        'enterprise': 3
      };

      if (!planHierarchy.hasOwnProperty(planId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
        return;
      }

      const pool = DatabaseConfig.getPool();
      
      // Get current plan
      const currentUser = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (currentUser.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const currentPlan = currentUser.rows[0].subscription_tier;
      
      // Validate downgrade
      if ((planHierarchy as any)[planId] >= (planHierarchy as any)[currentPlan]) {
        res.status(400).json({
          success: false,
          message: 'Cannot downgrade to a higher or same tier plan'
        });
        return;
      }

      // Update subscription
      const result = await pool.query(
        'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2 RETURNING subscription_tier',
        [planId, userId]
      );

      res.json({
        success: true,
        message: `Successfully downgraded to ${planId} plan`,
        data: {
          previousTier: currentPlan,
          currentTier: result.rows[0].subscription_tier,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Downgrade subscription error:', error);
      next(error);
    }
  }

  /**
   * Get available subscription plans
   */
  static async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = [
        {
          id: 'free',
          name: 'Free',
          description: 'Basic QR code generation',
          price: 0,
          features: ['Basic QR codes', 'Limited scans', 'Basic analytics'],
          limits: {
            qrCodes: 10,
            scansPerMonth: 1000
          }
        },
        {
          id: 'starter',
          name: 'Starter',
          description: 'Advanced QR features for individuals',
          price: 9.99,
          features: ['Custom designs', 'Advanced analytics', 'Unlimited scans'],
          limits: {
            qrCodes: 100,
            scansPerMonth: -1 // unlimited
          }
        },
        {
          id: 'professional',
          name: 'Professional',
          description: 'Complete solution for businesses',
          price: 29.99,
          features: ['White label', 'API access', 'Team collaboration', 'Priority support'],
          limits: {
            qrCodes: 1000,
            scansPerMonth: -1,
            teamMembers: 10
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Custom solutions for large organizations',
          price: 99.99,
          features: ['Custom integrations', 'Dedicated support', 'SLA guarantee', 'Unlimited everything'],
          limits: {
            qrCodes: -1,
            scansPerMonth: -1,
            teamMembers: -1
          }
        }
      ];

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Get plans error:', error);
      next(error);
    }
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const plans = {
        'free': {
          id: 'free',
          name: 'Free',
          description: 'Basic QR code generation',
          price: 0,
          features: ['Basic QR codes', 'Limited scans', 'Basic analytics'],
          limits: { qrCodes: 10, scansPerMonth: 1000 }
        },
        'starter': {
          id: 'starter',
          name: 'Starter',
          description: 'Advanced QR features for individuals',
          price: 9.99,
          features: ['Custom designs', 'Advanced analytics', 'Unlimited scans'],
          limits: { qrCodes: 100, scansPerMonth: -1 }
        },
        'professional': {
          id: 'professional',
          name: 'Professional',
          description: 'Complete solution for businesses',
          price: 29.99,
          features: ['White label', 'API access', 'Team collaboration', 'Priority support'],
          limits: { qrCodes: 1000, scansPerMonth: -1, teamMembers: 10 }
        },
        'enterprise': {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Custom solutions for large organizations',
          price: 99.99,
          features: ['Custom integrations', 'Dedicated support', 'SLA guarantee', 'Unlimited everything'],
          limits: { qrCodes: -1, scansPerMonth: -1, teamMembers: -1 }
        }
      };

      const plan = (plans as any)[id];
      if (!plan) {
        res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
        return;
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Get plan by ID error:', error);
      next(error);
    }
  }

  /**
   * Get subscription history
   */
  static async getSubscriptionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT subscription_tier, created_at, updated_at FROM users WHERE id = $1',
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

      // For now, return current subscription as history
      // In a full implementation, you'd have a subscription_history table
      res.json({
        success: true,
        data: [
          {
            tier: user.subscription_tier,
            startDate: user.created_at,
            lastModified: user.updated_at,
            status: 'active'
          }
        ]
      });
    } catch (error) {
      console.error('Get subscription history error:', error);
      next(error);
    }
  }

  /**
   * Get usage statistics
   */
  static async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      
      // Get QR codes count
      const qrCodesResult = await pool.query(
        'SELECT COUNT(*) as count FROM qr_codes WHERE user_id = $1',
        [userId]
      );

      // Get scans this month (if qr_analytics table exists)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const scansResult = await pool.query(
        'SELECT COALESCE(SUM(current_scans), 0) as total_scans FROM qr_codes WHERE user_id = $1',
        [userId]
      );

      res.json({
        success: true,
        data: {
          qrCodes: parseInt(qrCodesResult.rows[0].count),
          scansThisMonth: parseInt(scansResult.rows[0].total_scans),
          period: {
            start: currentMonth.toISOString(),
            end: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Get usage error:', error);
      next(error);
    }
  }

  /**
   * Get subscription limits
   */
  static async getLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).auth;

      const pool = DatabaseConfig.getPool();
      const userResult = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const tier = userResult.rows[0].subscription_tier;

      const limits = {
        'free': { qrCodes: 10, scansPerMonth: 1000, teamMembers: 1 },
        'starter': { qrCodes: 100, scansPerMonth: -1, teamMembers: 1 },
        'professional': { qrCodes: 1000, scansPerMonth: -1, teamMembers: 10 },
        'enterprise': { qrCodes: -1, scansPerMonth: -1, teamMembers: -1 }
      };

      res.json({
        success: true,
        data: {
          tier: tier,
          limits: (limits as any)[tier] || limits['free']
        }
      });
    } catch (error) {
      console.error('Get limits error:', error);
      next(error);
    }
  }

  // Admin-only methods
  static async getAllSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Admin functionality not implemented yet'
    });
  }

  static async getUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Admin functionality not implemented yet'
    });
  }

  static async overrideSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Admin functionality not implemented yet'
    });
  }
}