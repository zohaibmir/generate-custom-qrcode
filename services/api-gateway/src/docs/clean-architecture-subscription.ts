/**
 * @fileoverview Clean Architecture Subscription Management API Documentation
 * This file documents the subscription management endpoints proxied through the API Gateway
 * Subscription routes: /api/subscription/* -> user-service /subscription/*
 */

/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get available subscription plans
 *     description: |
 *       Retrieves all available subscription plans with their features and pricing.
 *       - Requires valid JWT token in Authorization header
 *       - Returns tier information for free, starter, professional, and enterprise plans
 *       - Includes feature limits and capabilities for each tier
 *       - Used for displaying pricing pages and upgrade options
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
 *                       example:
 *                         - id: free
 *                           name: Free
 *                           price: 0
 *                           currency: USD
 *                           billing: monthly
 *                           features:
 *                             qr_limit: 10
 *                             scan_limit: 100
 *                             team_members: 1
 *                             custom_domains: false
 *                             analytics: "basic"
 *                         - id: professional
 *                           name: Professional
 *                           price: 29.99
 *                           currency: USD
 *                           billing: monthly
 *                           features:
 *                             qr_limit: 1000
 *                             scan_limit: -1
 *                             team_members: 10
 *                             custom_domains: true
 *                             analytics: "advanced"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/subscription/current:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current user subscription
 *     description: |
 *       Retrieves the authenticated user's current subscription information.
 *       - Requires valid JWT token in Authorization header
 *       - Returns current tier, expiration, and usage statistics
 *       - Includes upgrade eligibility information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/UserSubscription'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/subscription/upgrade/{tier}:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Upgrade user subscription to specified tier
 *     description: |
 *       Upgrades the authenticated user's subscription to a higher tier.
 *       - Requires valid JWT token in Authorization header
 *       - Validates upgrade path (can only upgrade, not downgrade)
 *       - Updates subscription tier immediately for development
 *       - In production, would integrate with payment processing
 *       - Returns previous and new subscription information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [starter, professional, enterprise]
 *         description: Target subscription tier
 *         example: professional
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Subscription upgraded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     previousTier:
 *                       type: string
 *                       example: free
 *                     currentTier:
 *                       type: string
 *                       example: professional
 *                     upgradeDate:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T14:30:00Z
 *                     features:
 *                       $ref: '#/components/schemas/SubscriptionFeatures'
 *       400:
 *         description: Bad request - invalid tier or downgrade attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_tier:
 *                 summary: Invalid Tier
 *                 value:
 *                   success: false
 *                   error: Invalid subscription tier
 *               downgrade_attempt:
 *                 summary: Downgrade Not Allowed
 *                 value:
 *                   success: false
 *                   error: Cannot downgrade subscription tier. Current tier: professional, requested: starter
 *               same_tier:
 *                 summary: Already on Requested Tier
 *                 value:
 *                   success: false
 *                   error: User already has professional subscription
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/subscription/limits:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current subscription limits and features
 *     description: |
 *       Retrieves the authenticated user's current subscription limits and available features.
 *       - Requires valid JWT token in Authorization header
 *       - Returns feature limits based on current subscription tier
 *       - Used by frontend to enforce feature availability
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription limits retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: string
 *                       enum: [free, starter, professional, enterprise]
 *                       example: professional
 *                     limits:
 *                       $ref: '#/components/schemas/SubscriptionFeatures'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/subscription/usage:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current subscription usage statistics
 *     description: |
 *       Retrieves the authenticated user's current resource usage against their subscription limits.
 *       - Requires valid JWT token in Authorization header
 *       - Returns actual usage numbers and percentage of limits used
 *       - Helps users understand their current consumption
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: string
 *                       example: professional
 *                     usage:
 *                       $ref: '#/components/schemas/SubscriptionUsage'
 *                     limits:
 *                       $ref: '#/components/schemas/SubscriptionFeatures'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/subscription/history:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get user subscription history
 *     description: |
 *       Retrieves the authenticated user's subscription change history.
 *       - Requires valid JWT token in Authorization header
 *       - Returns chronological list of subscription changes
 *       - Includes dates, previous/new tiers, and reason for changes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionHistoryEntry'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export const subscriptionSchemas = {
  SubscriptionPlan: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        enum: ['free', 'starter', 'professional', 'enterprise'],
        description: 'Plan identifier'
      },
      name: {
        type: 'string',
        description: 'Human-readable plan name'
      },
      price: {
        type: 'number',
        description: 'Monthly price in specified currency'
      },
      currency: {
        type: 'string',
        description: 'Currency code (e.g., USD, EUR)'
      },
      billing: {
        type: 'string',
        enum: ['monthly', 'annual'],
        description: 'Billing frequency'
      },
      features: {
        $ref: '#/components/schemas/SubscriptionFeatures'
      }
    }
  },
  SubscriptionFeatures: {
    type: 'object',
    properties: {
      qr_limit: {
        type: 'integer',
        description: 'Maximum QR codes allowed (-1 for unlimited)'
      },
      scan_limit: {
        type: 'integer',
        description: 'Maximum scans per month (-1 for unlimited)'
      },
      team_members: {
        type: 'integer',
        description: 'Maximum team members allowed'
      },
      custom_domains: {
        type: 'boolean',
        description: 'Whether custom domains are allowed'
      },
      analytics: {
        type: 'string',
        enum: ['none', 'basic', 'advanced', 'enterprise'],
        description: 'Analytics feature level'
      },
      api_access: {
        type: 'boolean',
        description: 'Whether API access is available'
      },
      bulk_operations: {
        type: 'boolean',
        description: 'Whether bulk operations are available'
      },
      white_label: {
        type: 'boolean',
        description: 'Whether white-label branding is available'
      }
    },
    example: {
      qr_limit: 1000,
      scan_limit: -1,
      team_members: 10,
      custom_domains: true,
      analytics: 'advanced',
      api_access: true,
      bulk_operations: true,
      white_label: false
    }
  },
  UserSubscription: {
    type: 'object',
    properties: {
      userId: {
        type: 'integer',
        description: 'User ID'
      },
      tier: {
        type: 'string',
        enum: ['free', 'starter', 'professional', 'enterprise'],
        description: 'Current subscription tier'
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Subscription start date'
      },
      renewalDate: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Next renewal date (null for free tier)'
      },
      isActive: {
        type: 'boolean',
        description: 'Whether subscription is active'
      },
      features: {
        $ref: '#/components/schemas/SubscriptionFeatures'
      }
    },
    example: {
      userId: 1,
      tier: 'professional',
      startDate: '2024-01-15T10:30:00Z',
      renewalDate: '2024-02-15T10:30:00Z',
      isActive: true,
      features: {
        qr_limit: 1000,
        scan_limit: -1,
        team_members: 10,
        custom_domains: true,
        analytics: 'advanced'
      }
    }
  },
  SubscriptionUsage: {
    type: 'object',
    properties: {
      qr_codes_created: {
        type: 'integer',
        description: 'Number of QR codes created'
      },
      total_scans: {
        type: 'integer',
        description: 'Total number of scans'
      },
      team_members_count: {
        type: 'integer',
        description: 'Current number of team members'
      },
      storage_used: {
        type: 'number',
        description: 'Storage used in MB'
      },
      api_calls_made: {
        type: 'integer',
        description: 'API calls made this month'
      },
      percentage_used: {
        type: 'object',
        properties: {
          qr_limit: {
            type: 'number',
            description: 'Percentage of QR limit used'
          },
          scan_limit: {
            type: 'number',
            description: 'Percentage of scan limit used'
          },
          team_members: {
            type: 'number',
            description: 'Percentage of team member limit used'
          }
        }
      }
    },
    example: {
      qr_codes_created: 45,
      total_scans: 1250,
      team_members_count: 3,
      storage_used: 125.5,
      api_calls_made: 890,
      percentage_used: {
        qr_limit: 4.5,
        scan_limit: 0,
        team_members: 30
      }
    }
  },
  SubscriptionHistoryEntry: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'History entry ID'
      },
      userId: {
        type: 'integer',
        description: 'User ID'
      },
      previousTier: {
        type: 'string',
        enum: ['free', 'starter', 'professional', 'enterprise'],
        nullable: true,
        description: 'Previous subscription tier (null for initial subscription)'
      },
      newTier: {
        type: 'string',
        enum: ['free', 'starter', 'professional', 'enterprise'],
        description: 'New subscription tier'
      },
      changeDate: {
        type: 'string',
        format: 'date-time',
        description: 'Date of change'
      },
      reason: {
        type: 'string',
        description: 'Reason for the change'
      },
      paymentMethod: {
        type: 'string',
        nullable: true,
        description: 'Payment method used (if applicable)'
      }
    },
    example: {
      id: 1,
      userId: 1,
      previousTier: 'free',
      newTier: 'professional',
      changeDate: '2024-01-15T14:30:00Z',
      reason: 'User upgrade',
      paymentMethod: 'stripe'
    }
  }
};