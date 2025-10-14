/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send email or SMS notification with database persistence
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - recipient
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, sms]
 *                 description: Type of notification to send
 *               recipient:
 *                 type: string
 *                 description: Email address or phone number
 *                 example: "user@example.com"
 *               template:
 *                 type: string
 *                 description: Template name to use (optional)
 *                 example: "welcome"
 *               data:
 *                 type: object
 *                 description: Template data for personalization
 *                 example:
 *                   name: "John Doe"
 *                   message: "Welcome to our platform!"
 *               subject:
 *                 type: string
 *                 description: Email subject (for email notifications)
 *                 example: "Welcome to QR SaaS Platform"
 *               message:
 *                 type: string
 *                 description: SMS message (for SMS notifications)
 *                 example: "Your verification code is: 123456"
 *           examples:
 *             email_notification:
 *               summary: Email Notification
 *               value:
 *                 type: "email"
 *                 recipient: "user@example.com"
 *                 template: "welcome"
 *                 data:
 *                   name: "John Doe"
 *                   message: "Welcome to our QR Code platform!"
 *             sms_notification:
 *               summary: SMS Notification
 *               value:
 *                 type: "sms"
 *                 recipient: "+1234567890"
 *                 template: "verification"
 *                 data:
 *                   code: "123456"
 *                   message: "Your verification code is: 123456"
 *     responses:
 *       200:
 *         description: Notification sent successfully and stored in database
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         messageId:
 *                           type: string
 *                           format: uuid
 *                           description: Unique message identifier stored in database
 *                         status:
 *                           type: string
 *                           enum: [sent, failed]
 *                           description: Notification status
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *                           description: When notification was sent
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Notification service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/notifications/emails:
 *   get:
 *     summary: Get all email messages from database
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of emails per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed]
 *         description: Filter by email status
 *     responses:
 *       200:
 *         description: List of email messages from database
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           recipient:
 *                             type: string
 *                             format: email
 *                           subject:
 *                             type: string
 *                           content:
 *                             type: object
 *                           template_name:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, sent, failed]
 *                           sent_at:
 *                             type: string
 *                             format: date-time
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 */

/**
 * @swagger
 * /api/notifications/sms:
 *   get:
 *     summary: Get all SMS messages from database
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of SMS messages per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, failed]
 *         description: Filter by SMS status
 *     responses:
 *       200:
 *         description: List of SMS messages from database
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           phone_number:
 *                             type: string
 *                           message:
 *                             type: string
 *                           template_name:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, sent, failed]
 *                           sent_at:
 *                             type: string
 *                             format: date-time
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 */

/**
 * @swagger
 * /api/notifications/templates:
 *   get:
 *     summary: Get all notification templates from database
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: List of notification templates
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                             example: "welcome"
 *                           type:
 *                             type: string
 *                             enum: [email, sms, both]
 *                           content:
 *                             type: object
 *                             description: Template content with placeholders
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 */

/**
 * @swagger
 * /api/notifications/status/{messageId}:
 *   get:
 *     summary: Get notification status from database
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID to check status
 *     responses:
 *       200:
 *         description: Notification status from database
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         messageId:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           enum: [pending, sent, failed]
 *                         sentAt:
 *                           type: string
 *                           format: date-time
 *                         type:
 *                           type: string
 *                           enum: [email, sms]
 *       404:
 *         description: Message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/notifications/health:
 *   get:
 *     summary: Check notification service health and database connectivity
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification service health status
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
 *                     service:
 *                       type: string
 *                       example: "notification-service"
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     dependencies:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: [healthy, unhealthy]
 *                             responseTime:
 *                               type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */