/**
 * @swagger
 * tags:
 *   - name: Dynamic QR - Content Versions
 *     description: Manage dynamic content versions for QR codes
 *   - name: Dynamic QR - A/B Testing
 *     description: A/B testing functionality for QR codes
 *   - name: Dynamic QR - Redirect Rules
 *     description: Conditional redirect rules based on user context
 *   - name: Dynamic QR - Content Scheduling
 *     description: Schedule content activation and deactivation
 *   - name: Dynamic QR - Analytics
 *     description: Analytics and statistics for dynamic QR codes
 *   - name: Dynamic QR - Resolution
 *     description: Dynamic QR code resolution and redirect logic
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     QRContentVersion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the content version
 *         qrCodeId:
 *           type: string
 *           description: ID of the parent QR code
 *         versionNumber:
 *           type: integer
 *           description: Sequential version number
 *         content:
 *           type: object
 *           description: QR code content (JSONB)
 *         redirectUrl:
 *           type: string
 *           description: Redirect URL for this version
 *         isActive:
 *           type: boolean
 *           description: Whether this version is currently active
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: When this version was scheduled for activation
 *         activatedAt:
 *           type: string
 *           format: date-time
 *           description: When this version was activated
 *         deactivatedAt:
 *           type: string
 *           format: date-time
 *           description: When this version was deactivated
 *         createdBy:
 *           type: string
 *           description: ID of the user who created this version
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When this version was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When this version was last updated
 *       required:
 *         - id
 *         - qrCodeId
 *         - versionNumber
 *         - content
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *
 *     QRABTest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the A/B test
 *         qrCodeId:
 *           type: string
 *           description: ID of the parent QR code
 *         testName:
 *           type: string
 *           description: Name of the A/B test
 *         description:
 *           type: string
 *           description: Description of the test
 *         variantAVersionId:
 *           type: string
 *           description: Content version ID for variant A
 *         variantBVersionId:
 *           type: string
 *           description: Content version ID for variant B
 *         trafficSplit:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of traffic for variant A
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Test start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Test end date
 *         status:
 *           type: string
 *           enum: [draft, running, paused, completed]
 *           description: Current status of the A/B test
 *         winnerVariant:
 *           type: string
 *           enum: [A, B]
 *           description: Winning variant (if test is completed)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When this test was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When this test was last updated
 *       required:
 *         - id
 *         - qrCodeId
 *         - testName
 *         - variantAVersionId
 *         - variantBVersionId
 *         - trafficSplit
 *         - startDate
 *         - status
 *         - createdAt
 *         - updatedAt
 *
 *     QRRedirectRule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the redirect rule
 *         qrCodeId:
 *           type: string
 *           description: ID of the parent QR code
 *         ruleName:
 *           type: string
 *           description: Name of the redirect rule
 *         ruleType:
 *           type: string
 *           enum: [geographic, device, time, custom]
 *           description: Type of redirect condition
 *         conditions:
 *           type: object
 *           description: Rule conditions (JSONB)
 *           example:
 *             countries: ["US", "CA"]
 *             deviceTypes: ["mobile", "tablet"]
 *         targetVersionId:
 *           type: string
 *           description: Target content version ID
 *         priority:
 *           type: number
 *           description: Rule priority (lower number = higher priority)
 *         isEnabled:
 *           type: boolean
 *           description: Whether the rule is enabled
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When this rule was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When this rule was last updated
 *       required:
 *         - id
 *         - qrCodeId
 *         - ruleName
 *         - ruleType
 *         - conditions
 *         - targetVersionId
 *         - priority
 *         - isEnabled
 *         - createdAt
 *         - updatedAt
 *
 *     QRContentSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the content schedule
 *         qrCodeId:
 *           type: string
 *           description: ID of the parent QR code
 *         versionId:
 *           type: string
 *           description: Content version ID to schedule
 *         scheduleName:
 *           type: string
 *           description: Name of the schedule
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Schedule start time
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Schedule end time
 *         repeatPattern:
 *           type: string
 *           enum: [none, daily, weekly, monthly]
 *           description: Repeat pattern for the schedule
 *         repeatDays:
 *           type: array
 *           items:
 *             type: number
 *             minimum: 1
 *             maximum: 7
 *           description: Days of week for repeat (1=Monday, 7=Sunday)
 *         timezone:
 *           type: string
 *           description: Timezone for the schedule
 *         isActive:
 *           type: boolean
 *           description: Whether the schedule is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When this schedule was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When this schedule was last updated
 *       required:
 *         - id
 *         - qrCodeId
 *         - versionId
 *         - scheduleName
 *         - startTime
 *         - repeatPattern
 *         - timezone
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *
 *     DynamicQRStats:
 *       type: object
 *       properties:
 *         qrCodeId:
 *           type: string
 *           description: QR code ID
 *         totalVersions:
 *           type: number
 *           description: Total number of content versions
 *         activeVersion:
 *           type: number
 *           description: Currently active version number
 *         totalScans:
 *           type: number
 *           description: Total number of scans across all versions
 *         versionsPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               versionId:
 *                 type: string
 *               versionNumber:
 *                 type: number
 *               scans:
 *                 type: number
 *               conversionRate:
 *                 type: number
 *           description: Performance metrics for each version
 *         abTestsRunning:
 *           type: number
 *           description: Number of currently running A/B tests
 *         redirectRulesActive:
 *           type: number
 *           description: Number of active redirect rules
 *         scheduledContent:
 *           type: number
 *           description: Number of scheduled content items
 *       required:
 *         - qrCodeId
 *         - totalVersions
 *         - activeVersion
 *         - totalScans
 *         - versionsPerformance
 *         - abTestsRunning
 *         - redirectRulesActive
 *         - scheduledContent
 *
 *     CreateContentVersionRequest:
 *       type: object
 *       properties:
 *         content:
 *           type: object
 *           description: QR code content (JSONB)
 *         redirectUrl:
 *           type: string
 *           description: Redirect URL for this version
 *         isActive:
 *           type: boolean
 *           description: Whether this version should be active
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: When to activate this version
 *       required:
 *         - content
 *
 *     CreateABTestRequest:
 *       type: object
 *       properties:
 *         testName:
 *           type: string
 *           description: Name of the A/B test
 *         description:
 *           type: string
 *           description: Description of the test
 *         variantAVersionId:
 *           type: string
 *           description: Version ID for variant A
 *         variantBVersionId:
 *           type: string
 *           description: Version ID for variant B
 *         trafficSplit:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of traffic for variant A (default 50)
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Test start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Test end date (optional)
 *       required:
 *         - testName
 *         - variantAVersionId
 *         - variantBVersionId
 *         - startDate
 *
 *     CreateRedirectRuleRequest:
 *       type: object
 *       properties:
 *         ruleName:
 *           type: string
 *           description: Name of the redirect rule
 *         ruleType:
 *           type: string
 *           enum: [geographic, device, time, custom]
 *           description: Type of redirect condition
 *         conditions:
 *           type: object
 *           description: Rule conditions (JSONB)
 *           example:
 *             countries: ["US", "CA"]
 *             deviceTypes: ["mobile", "tablet"]
 *         targetVersionId:
 *           type: string
 *           description: Target content version ID
 *         priority:
 *           type: number
 *           description: Rule priority (lower number = higher priority)
 *         isEnabled:
 *           type: boolean
 *           description: Whether the rule is enabled
 *       required:
 *         - ruleName
 *         - ruleType
 *         - conditions
 *         - targetVersionId
 *
 *     CreateContentScheduleRequest:
 *       type: object
 *       properties:
 *         versionId:
 *           type: string
 *           description: Content version ID to schedule
 *         scheduleName:
 *           type: string
 *           description: Name of the schedule
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Schedule start time
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Schedule end time (optional)
 *         repeatPattern:
 *           type: string
 *           enum: [none, daily, weekly, monthly]
 *           description: Repeat pattern for the schedule
 *         repeatDays:
 *           type: array
 *           items:
 *             type: number
 *             minimum: 1
 *             maximum: 7
 *           description: Days of week for repeat (1=Monday, 7=Sunday)
 *         timezone:
 *           type: string
 *           description: Timezone for the schedule
 *         isActive:
 *           type: boolean
 *           description: Whether the schedule is active
 *       required:
 *         - versionId
 *         - scheduleName
 *         - startTime
 */

/**
 * @swagger
 * /api/qr/{qrCodeId}/versions:
 *   post:
 *     summary: Create a new content version
 *     description: Create a new content version for dynamic QR codes with versioning capabilities
 *     tags: [Dynamic QR - Content Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContentVersionRequest'
 *           examples:
 *             url_version:
 *               summary: URL Content Version
 *               value:
 *                 content:
 *                   type: "url"
 *                   url: "https://example.com/new-landing-page"
 *                   title: "New Landing Page"
 *                 redirectUrl: "https://example.com/new-landing-page"
 *                 isActive: false
 *             text_version:
 *               summary: Text Content Version
 *               value:
 *                 content:
 *                   type: "text"
 *                   text: "Updated promotional message for holiday sale!"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Content version created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRContentVersion'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
 *
 *   get:
 *     summary: Get all content versions for a QR code
 *     description: Retrieve all content versions for a specific QR code with version history
 *     tags: [Dynamic QR - Content Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Content versions retrieved successfully
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
 *                         $ref: '#/components/schemas/QRContentVersion'
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/versions/active:
 *   get:
 *     summary: Get the active content version for a QR code
 *     description: Retrieve the currently active content version for a specific QR code
 *     tags: [Dynamic QR - Content Versions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Active content version retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRContentVersion'
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/ab-tests:
 *   post:
 *     summary: Create a new A/B test
 *     description: Create a new A/B test to compare two content versions with traffic splitting
 *     tags: [Dynamic QR - A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateABTestRequest'
 *           examples:
 *             landing_page_test:
 *               summary: Landing Page A/B Test
 *               value:
 *                 testName: "Landing Page Conversion Test"
 *                 description: "Testing two different landing page designs for conversion rate"
 *                 variantAVersionId: "version-123"
 *                 variantBVersionId: "version-124"
 *                 trafficSplit: 50
 *                 startDate: "2024-01-15T10:00:00Z"
 *                 endDate: "2024-01-30T10:00:00Z"
 *     responses:
 *       201:
 *         description: A/B test created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRABTest'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
 *
 *   get:
 *     summary: Get all A/B tests for a QR code
 *     description: Retrieve all A/B tests configured for a specific QR code
 *     tags: [Dynamic QR - A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: A/B tests retrieved successfully
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
 *                         $ref: '#/components/schemas/QRABTest'
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/redirect-rules:
 *   post:
 *     summary: Create a new redirect rule
 *     description: Create conditional redirect rules based on user location, device, time, or custom conditions
 *     tags: [Dynamic QR - Redirect Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRedirectRuleRequest'
 *           examples:
 *             geographic_rule:
 *               summary: Geographic Redirect Rule
 *               value:
 *                 ruleName: "US/Canada Mobile Redirect"
 *                 ruleType: "geographic"
 *                 conditions:
 *                   countries: ["US", "CA"]
 *                 targetVersionId: "version-125"
 *                 priority: 1
 *                 isEnabled: true
 *             device_rule:
 *               summary: Device-based Redirect Rule
 *               value:
 *                 ruleName: "Mobile Users Special Page"
 *                 ruleType: "device"
 *                 conditions:
 *                   deviceTypes: ["mobile", "tablet"]
 *                   browsers: ["Chrome", "Safari"]
 *                 targetVersionId: "version-126"
 *                 priority: 2
 *                 isEnabled: true
 *     responses:
 *       201:
 *         description: Redirect rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRRedirectRule'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
 *
 *   get:
 *     summary: Get all redirect rules for a QR code
 *     description: Retrieve all redirect rules configured for a specific QR code
 *     tags: [Dynamic QR - Redirect Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Redirect rules retrieved successfully
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
 *                         $ref: '#/components/schemas/QRRedirectRule'
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/schedules:
 *   post:
 *     summary: Create a new content schedule
 *     description: Schedule content versions to be activated at specific times with optional repeat patterns
 *     tags: [Dynamic QR - Content Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContentScheduleRequest'
 *           examples:
 *             daily_schedule:
 *               summary: Daily Business Hours Schedule
 *               value:
 *                 versionId: "version-127"
 *                 scheduleName: "Business Hours Landing Page"
 *                 startTime: "2024-01-15T09:00:00Z"
 *                 endTime: "2024-01-15T17:00:00Z"
 *                 repeatPattern: "daily"
 *                 repeatDays: [1, 2, 3, 4, 5]
 *                 timezone: "America/New_York"
 *                 isActive: true
 *             weekend_schedule:
 *               summary: Weekend Promotion Schedule
 *               value:
 *                 versionId: "version-128"
 *                 scheduleName: "Weekend Special Offers"
 *                 startTime: "2024-01-13T00:00:00Z"
 *                 endTime: "2024-01-14T23:59:59Z"
 *                 repeatPattern: "weekly"
 *                 repeatDays: [6, 7]
 *                 timezone: "UTC"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Content schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRContentSchedule'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
 *
 *   get:
 *     summary: Get all content schedules for a QR code
 *     description: Retrieve all content schedules configured for a specific QR code
 *     tags: [Dynamic QR - Content Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Content schedules retrieved successfully
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
 *                         $ref: '#/components/schemas/QRContentSchedule'
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/stats:
 *   get:
 *     summary: Get dynamic QR statistics
 *     description: Retrieve comprehensive statistics and performance metrics for dynamic QR codes including version performance, A/B test results, and usage analytics
 *     tags: [Dynamic QR - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DynamicQRStats'
 *             examples:
 *               dynamic_stats:
 *                 summary: Dynamic QR Statistics
 *                 value:
 *                   success: true
 *                   data:
 *                     qrCodeId: "qr-123"
 *                     totalVersions: 5
 *                     activeVersion: 3
 *                     totalScans: 1247
 *                     versionsPerformance:
 *                       - versionId: "v1"
 *                         versionNumber: 1
 *                         scans: 234
 *                         conversionRate: 12.5
 *                       - versionId: "v2"
 *                         versionNumber: 2
 *                         scans: 456
 *                         conversionRate: 18.2
 *                       - versionId: "v3"
 *                         versionNumber: 3
 *                         scans: 557
 *                         conversionRate: 22.1
 *                     abTestsRunning: 2
 *                     redirectRulesActive: 3
 *                     scheduledContent: 1
 *       401:
 *         description: Unauthorized
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
 * /api/qr/{qrCodeId}/resolve:
 *   get:
 *     summary: Resolve QR code redirect with dynamic logic
 *     description: |
 *       Intelligently resolve QR code redirects using dynamic logic that evaluates:
 *       - Active A/B tests with traffic splitting
 *       - Conditional redirect rules (geographic, device, time-based)
 *       - Scheduled content activation
 *       - Fallback to active content version
 *       
 *       This endpoint is typically called by QR code scanners and will return a 302 redirect to the appropriate destination URL.
 *     tags: [Dynamic QR - Resolution]
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR Code ID
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: User's country code for geo-targeting (e.g., US, CA, UK)
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: User's region for geo-targeting
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: User's city for geo-targeting
 *       - in: header
 *         name: User-Agent
 *         schema:
 *           type: string
 *         description: User agent string for device and browser detection
 *       - in: header
 *         name: X-Session-ID
 *         schema:
 *           type: string
 *         description: Session ID for consistent A/B test assignment
 *     responses:
 *       302:
 *         description: Redirect to resolved URL
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: The resolved redirect URL
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "Redirecting to https://example.com/landing-page"
 *       404:
 *         description: No active content found for QR code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_content:
 *                 summary: No Active Content
 *                 value:
 *                   success: false
 *                   error: "No active content version found for QR code"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/qr/ab-tests/{testId}/start:
 *   post:
 *     summary: Start an A/B test
 *     description: Start a draft A/B test to begin traffic splitting between variants
 *     tags: [Dynamic QR - A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     responses:
 *       200:
 *         description: A/B test started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRABTest'
 *       400:
 *         description: Test cannot be started (not in draft status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Test not found
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
 * /api/qr/ab-tests/{testId}/pause:
 *   post:
 *     summary: Pause an A/B test
 *     description: Pause a running A/B test to temporarily stop traffic splitting
 *     tags: [Dynamic QR - A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     responses:
 *       200:
 *         description: A/B test paused successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRABTest'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Test not found
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
 * /api/qr/ab-tests/{testId}/complete:
 *   post:
 *     summary: Complete an A/B test
 *     description: Mark an A/B test as completed and optionally declare a winning variant
 *     tags: [Dynamic QR - A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: A/B Test ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerVariant:
 *                 type: string
 *                 enum: [A, B]
 *                 description: Winning variant (optional)
 *           examples:
 *             with_winner:
 *               summary: Complete with Winner
 *               value:
 *                 winnerVariant: "B"
 *             without_winner:
 *               summary: Complete without Winner
 *               value: {}
 *     responses:
 *       200:
 *         description: A/B test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRABTest'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Test not found
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