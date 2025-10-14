/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     description: Retrieves all active subscription plans with pricing and features
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Successfully retrieved subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "Free Plan"
 *                   description: "Perfect for getting started"
 *                   price: 0
 *                   billingCycle: "monthly"
 *                   features:
 *                     custom_domains: false
 *                     advanced_analytics: false
 *                     priority_support: false
 *                   maxQrCodes: 10
 *                   maxScansPerMonth: 1000
 *                   isActive: true
 *                   displayOrder: 1
 *                 - id: "550e8400-e29b-41d4-a716-446655440001"
 *                   name: "Pro Plan"
 *                   description: "Perfect for growing businesses"
 *                   price: 2999
 *                   billingCycle: "monthly"
 *                   features:
 *                     custom_domains: true
 *                     advanced_analytics: true
 *                     priority_support: true
 *                   maxQrCodes: 1000
 *                   maxScansPerMonth: 50000
 *                   isActive: true
 *                   displayOrder: 2
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a plan
 *     description: Creates a new subscription for the authenticated user with Stripe payment processing
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscribeRequest'
 *           example:
 *             planId: "550e8400-e29b-41d4-a716-446655440001"
 *             paymentMethodId: "pm_1234567890abcdef"
 *             trialPeriodDays: 14
 *     responses:
 *       201:
 *         description: Successfully created subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserSubscription'
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440002"
 *                 userId: "550e8400-e29b-41d4-a716-446655440003"
 *                 planId: "550e8400-e29b-41d4-a716-446655440001"
 *                 stripeSubscriptionId: "sub_1234567890abcdef"
 *                 status: "active"
 *                 currentPeriodStart: "2024-01-15T00:00:00.000Z"
 *                 currentPeriodEnd: "2024-02-15T00:00:00.000Z"
 *                 trialEnd: "2024-01-29T00:00:00.000Z"
 *                 cancelAtPeriodEnd: false
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_PLAN"
 *                 message: "Plan not found or inactive"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already has an active subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SUBSCRIPTION_EXISTS"
 *                 message: "User already has an active subscription"
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel current subscription
 *     description: Cancels the user's current subscription. By default, the subscription remains active until the end of the current billing period.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immediate:
 *                 type: boolean
 *                 description: Whether to cancel immediately or at period end
 *                 default: false
 *           example:
 *             immediate: false
 *     responses:
 *       200:
 *         description: Successfully cancelled subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserSubscription'
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440002"
 *                 status: "active"
 *                 cancelAtPeriodEnd: true
 *                 currentPeriodEnd: "2024-02-15T00:00:00.000Z"
 *       400:
 *         description: No active subscription found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "NO_SUBSCRIPTION"
 *                 message: "No active subscription found"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/reactivate:
 *   post:
 *     summary: Reactivate cancelled subscription
 *     description: Reactivates a subscription that was set to cancel at period end
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully reactivated subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserSubscription'
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440002"
 *                 status: "active"
 *                 cancelAtPeriodEnd: false
 *       400:
 *         description: No subscription found or subscription cannot be reactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "CANNOT_REACTIVATE"
 *                 message: "Subscription cannot be reactivated"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get current subscription details
 *     description: Retrieves the authenticated user's current subscription information
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current subscription
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
 *                     plan:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 *                     usage:
 *                       $ref: '#/components/schemas/SubscriptionUsage'
 *             example:
 *               success: true
 *               data:
 *                 subscription:
 *                   id: "550e8400-e29b-41d4-a716-446655440002"
 *                   status: "active"
 *                   currentPeriodStart: "2024-01-15T00:00:00.000Z"
 *                   currentPeriodEnd: "2024-02-15T00:00:00.000Z"
 *                   cancelAtPeriodEnd: false
 *                 plan:
 *                   name: "Pro Plan"
 *                   price: 2999
 *                   maxQrCodes: 1000
 *                   maxScansPerMonth: 50000
 *                 usage:
 *                   qrCodesCreated: 25
 *                   scansThisPeriod: 1250
 *       404:
 *         description: No active subscription found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "NO_SUBSCRIPTION"
 *                 message: "No active subscription found"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/update-payment:
 *   put:
 *     summary: Update payment method
 *     description: Updates the payment method for the user's current subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentMethodRequest'
 *           example:
 *             paymentMethodId: "pm_1234567890abcdef"
 *     responses:
 *       200:
 *         description: Successfully updated payment method
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
 *                     message:
 *                       type: string
 *                       example: "Payment method updated successfully"
 *                     paymentMethod:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         type:
 *                           type: string
 *                         card:
 *                           type: object
 *                           properties:
 *                             brand:
 *                               type: string
 *                             last4:
 *                               type: string
 *                             expMonth:
 *                               type: number
 *                             expYear:
 *                               type: number
 *             example:
 *               success: true
 *               data:
 *                 message: "Payment method updated successfully"
 *                 paymentMethod:
 *                   id: "pm_1234567890abcdef"
 *                   type: "card"
 *                   card:
 *                     brand: "visa"
 *                     last4: "4242"
 *                     expMonth: 12
 *                     expYear: 2025
 *       400:
 *         description: Invalid payment method or no active subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/billing-history:
 *   get:
 *     summary: Get billing history
 *     description: Retrieves the user's billing history and invoices from Stripe
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of invoices to retrieve
 *       - in: query
 *         name: startingAfter
 *         schema:
 *           type: string
 *         description: Stripe invoice ID to start pagination after
 *     responses:
 *       200:
 *         description: Successfully retrieved billing history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BillingHistoryResponse'
 *             example:
 *               success: true
 *               data:
 *                 invoices:
 *                   - id: "in_1234567890abcdef"
 *                     amount: 2999
 *                     currency: "usd"
 *                     status: "paid"
 *                     created: 1642723200
 *                     paidAt: 1642723300
 *                     invoiceUrl: "https://pay.stripe.com/invoice/acct_..."
 *                   - id: "in_0987654321fedcba"
 *                     amount: 2999
 *                     currency: "usd"
 *                     status: "paid"
 *                     created: 1640131200
 *                     paidAt: 1640131300
 *                     invoiceUrl: "https://pay.stripe.com/invoice/acct_..."
 *                 hasMore: false
 *                 total: 2
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/subscriptions/usage:
 *   get:
 *     summary: Get subscription usage statistics
 *     description: Retrieves detailed usage statistics for the current billing period
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved usage statistics
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
 *                     usage:
 *                       $ref: '#/components/schemas/SubscriptionUsage'
 *                     limits:
 *                       type: object
 *                       properties:
 *                         maxQrCodes:
 *                           type: number
 *                         maxScansPerMonth:
 *                           type: number
 *                     percentages:
 *                       type: object
 *                       properties:
 *                         qrCodesUsed:
 *                           type: number
 *                           description: Percentage of QR codes used
 *                         scansUsed:
 *                           type: number
 *                           description: Percentage of scans used
 *             example:
 *               success: true
 *               data:
 *                 usage:
 *                   qrCodesCreated: 25
 *                   scansThisPeriod: 1250
 *                   periodStart: "2024-01-15T00:00:00.000Z"
 *                   periodEnd: "2024-02-15T00:00:00.000Z"
 *                 limits:
 *                   maxQrCodes: 1000
 *                   maxScansPerMonth: 50000
 *                 percentages:
 *                   qrCodesUsed: 2.5
 *                   scansUsed: 2.5
 *       404:
 *         description: No active subscription found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */