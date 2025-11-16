/**
 * @swagger
 * /api/qr:
 *   get:
 *     summary: Get user's QR codes
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of QR codes per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [url, text, email, sms, wifi, vcard]
 *         description: Filter by QR code type
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of QR codes
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
 *                         $ref: '#/components/schemas/QRCode'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *   post:
 *     summary: Create a new QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - type
 *               - title
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (extracted from request or token)
 *               data:
 *                 type: string
 *                 description: The data to encode in QR code
 *                 example: "https://example.com"
 *               type:
 *                 type: string
 *                 enum: [url, text, email, sms, wifi, vcard]
 *                 description: Type of QR code content
 *               title:
 *                 type: string
 *                 description: QR code title
 *                 example: "My Website"
 *               description:
 *                 type: string
 *                 description: QR code description
 *                 example: "QR code for my company website"
 *               customization:
 *                 type: object
 *                 properties:
 *                   size:
 *                     type: number
 *                     minimum: 100
 *                     maximum: 1000
 *                     default: 200
 *                     description: QR code size in pixels
 *                   format:
 *                     type: string
 *                     enum: [png, jpg, svg]
 *                     default: png
 *                     description: Image format
 *                   errorCorrectionLevel:
 *                     type: string
 *                     enum: [L, M, Q, H]
 *                     default: M
 *                     description: Error correction level
 *                   margin:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                     default: 4
 *                     description: Margin around QR code
 *               scanLimit:
 *                 type: number
 *                 description: Maximum number of scans allowed (null for unlimited)
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date (null for no expiration)
 *           examples:
 *             url_qr:
 *               summary: Website URL QR Code
 *               value:
 *                 data: "https://example.com"
 *                 type: "url"
 *                 title: "Company Website"
 *                 description: "QR code linking to our main website"
 *                 customization:
 *                   size: 300
 *                   format: "png"
 *                   errorCorrectionLevel: "M"
 *             wifi_qr:
 *               summary: WiFi QR Code
 *               value:
 *                 data: "WIFI:T:WPA;S:MyNetwork;P:MyPassword;;"
 *                 type: "wifi"
 *                 title: "Office WiFi"
 *                 description: "QR code for office WiFi access"
 *                 customization:
 *                   size: 250
 *                   format: "png"
 *                   errorCorrectionLevel: "H"
 *             text_qr:
 *               summary: Text QR Code
 *               value:
 *                 data: "Hello World! This is a text QR code."
 *                 type: "text"
 *                 title: "Welcome Message"
 *                 description: "QR code with welcome text"
 *     responses:
 *       201:
 *         description: QR code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRCode'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/qr/{id}:
 *   get:
 *     summary: Get QR code by ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: QR code details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRCode'
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated QR Code Title"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               data:
 *                 type: string
 *                 example: "https://updated-example.com"
 *               isActive:
 *                 type: boolean
 *                 description: Whether QR code is active
 *               scanLimit:
 *                 type: number
 *                 description: Maximum allowed scans
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date
 *     responses:
 *       200:
 *         description: QR code updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRCode'
 *   delete:
 *     summary: Delete QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: QR code deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /api/qr/{id}/image:
 *   get:
 *     summary: Generate QR code image
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [png, jpg, svg]
 *           default: png
 *         description: Image format
 *       - in: query
 *         name: size
 *         schema:
 *           type: number
 *           minimum: 100
 *           maximum: 1000
 *           default: 200
 *         description: Image size in pixels
 *       - in: query
 *         name: errorCorrectionLevel
 *         schema:
 *           type: string
 *           enum: [L, M, Q, H]
 *           default: M
 *         description: Error correction level
 *     responses:
 *       200:
 *         description: QR code image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /r/{shortId}:
 *   get:
 *     summary: Redirect to QR code target URL
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: shortId
 *         required: true
 *         schema:
 *           type: string
 *         description: Short ID for the QR code
 *         example: "abc123"
 *     responses:
 *       302:
 *         description: Redirect to target URL
 *       404:
 *         description: QR code not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       410:
 *         description: QR code expired or reached scan limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/qr/{shortId}/validate:
 *   get:
 *     summary: Validate QR code without scanning
 *     description: Check if a QR code is valid for scanning without incrementing the scan count
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: shortId
 *         required: true
 *         schema:
 *           type: string
 *         description: Short ID for the QR code
 *         example: "abc123"
 *       - in: query
 *         name: password
 *         schema:
 *           type: string
 *         description: Password for protected QR code
 *     responses:
 *       200:
 *         description: QR code validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       description: Whether the QR code is valid for scanning
 *                     reason:
 *                       type: string
 *                       enum: [VALID, QR_CODE_INACTIVE, QR_CODE_EXPIRED, SCAN_LIMIT_EXCEEDED, PASSWORD_REQUIRED, QR_CODE_SCHEDULED, VALIDATION_ERROR]
 *                     message:
 *                       type: string
 *                       description: Human-readable validation message
 *                     checks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           checkType:
 *                             type: string
 *                           isValid:
 *                             type: boolean
 *                           message:
 *                             type: string
 *                           details:
 *                             type: object
 *                     expiredAt:
 *                       type: string
 *                       format: date-time
 *                       description: Expiration date if expired
 *                     currentScans:
 *                       type: number
 *                       description: Current scan count
 *                     maxScans:
 *                       type: number
 *                       description: Maximum allowed scans
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/qr/{id}/validity:
 *   put:
 *     summary: Update QR code validity settings
 *     description: Update expiration, scan limits, password protection, and scheduling
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *       - in: header
 *         name: x-subscription-tier
 *         schema:
 *           type: string
 *           enum: [free, starter, pro, business, enterprise]
 *         description: User's subscription tier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 description: QR code expiration date
 *                 example: "2025-12-31T23:59:59.000Z"
 *               max_scans:
 *                 type: number
 *                 description: Maximum number of scans allowed
 *                 minimum: 1
 *                 example: 100
 *               password:
 *                 type: string
 *                 description: Password to protect QR code
 *                 minLength: 4
 *                 example: "secret123"
 *               valid_schedule:
 *                 type: object
 *                 description: Schedule when QR code is active
 *                 properties:
 *                   dailyHours:
 *                     type: object
 *                     properties:
 *                       startHour:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 23
 *                       startMinute:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 59
 *                       endHour:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 23
 *                       endMinute:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 59
 *                   weeklyDays:
 *                     type: array
 *                     items:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 6
 *                     description: Days of week (0=Sunday, 1=Monday, etc.)
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       startDate:
 *                         type: string
 *                         format: date
 *                       endDate:
 *                         type: string
 *                         format: date
 *               is_active:
 *                 type: boolean
 *                 description: Whether QR code is active
 *     responses:
 *       200:
 *         description: QR code validity settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QRCode'
 *       400:
 *         description: Invalid validity parameters or subscription limits exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Invalid validity parameters"
 *                     details:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Expiration date cannot exceed 30 days for free tier"]
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/validity-limits/{tier}:
 *   get:
 *     summary: Get validity limits for subscription tier
 *     description: Retrieve the validity configuration limits for a specific subscription tier
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema:
 *           type: string
 *           enum: [free, starter, pro, business, enterprise]
 *         description: Subscription tier
 *     responses:
 *       200:
 *         description: Validity limits for the subscription tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     maxExpirationDays:
 *                       type: number
 *                       nullable: true
 *                       description: Maximum days QR code can be valid (null = unlimited)
 *                     maxScanLimit:
 *                       type: number
 *                       nullable: true
 *                       description: Maximum scans allowed (null = unlimited)
 *                     allowPasswordProtection:
 *                       type: boolean
 *                       description: Whether password protection is allowed
 *                     allowScheduling:
 *                       type: boolean
 *                       description: Whether scheduling is allowed
 *                     allowUnlimitedScans:
 *                       type: boolean
 *                       description: Whether unlimited scans are allowed
 *               example:
 *                 success: true
 *                 data:
 *                   maxExpirationDays: 30
 *                   maxScanLimit: 100
 *                   allowPasswordProtection: false
 *                   allowScheduling: false
 *                   allowUnlimitedScans: false

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get user's QR categories
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of QR categories
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
 *                           description:
 *                             type: string
 *                           color:
 *                             type: string
 *                           qrCount:
 *                             type: number
 *   post:
 *     summary: Create a new QR category
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Marketing Campaigns"
 *               description:
 *                 type: string
 *                 example: "QR codes for marketing purposes"
 *               color:
 *                 type: string
 *                 example: "#3b82f6"
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input data

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get QR category by ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 *   put:
 *     summary: Update QR category
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *   delete:
 *     summary: Delete QR category
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found

/**
 * @swagger
 * /api/qr/{id}/rules:
 *   post:
 *     summary: Create a new content rule for QR code
 *     description: Add dynamic content rules that serve different content based on device, location, time, or language
 *     tags: [Advanced QR Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rule_name
 *               - rule_type
 *               - rule_data
 *               - content_type
 *               - content_value
 *             properties:
 *               rule_name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Human-readable rule name
 *               rule_type:
 *                 type: string
 *                 enum: [time, location, language, device]
 *                 description: Type of content rule
 *               rule_data:
 *                 type: object
 *                 description: Rule configuration (see schema examples)
 *               content_type:
 *                 type: string
 *                 enum: [url, text, landing_page]
 *                 description: Type of content to serve
 *               content_value:
 *                 type: string
 *                 description: The actual content
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *                 description: Rule priority for resolution order
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: Whether rule is active
 *           examples:
 *             device_rule:
 *               summary: Device-based Content Rule
 *               value:
 *                 rule_name: "Mobile Users - App Store"
 *                 rule_type: "device"
 *                 rule_data:
 *                   device_types: ["mobile"]
 *                 content_type: "url"
 *                 content_value: "https://app.example.com/download"
 *                 priority: 1
 *             location_rule:
 *               summary: Location-based Content Rule
 *               value:
 *                 rule_name: "European Users"
 *                 rule_type: "location"
 *                 rule_data:
 *                   countries: ["GB", "DE", "FR", "ES", "IT"]
 *                 content_type: "url"
 *                 content_value: "https://eu.example.com"
 *                 priority: 2
 *             time_rule:
 *               summary: Time-based Content Rule
 *               value:
 *                 rule_name: "Business Hours Menu"
 *                 rule_type: "time"
 *                 rule_data:
 *                   schedule:
 *                     days_of_week: [1, 2, 3, 4, 5]
 *                     start_time: "09:00"
 *                     end_time: "17:00"
 *                     timezone: "America/New_York"
 *                 content_type: "url"
 *                 content_value: "https://restaurant.example.com/lunch-menu"
 *                 priority: 3
 *             language_rule:
 *               summary: Language-based Content Rule
 *               value:
 *                 rule_name: "Spanish Language Landing"
 *                 rule_type: "language"
 *                 rule_data:
 *                   languages: ["es"]
 *                   regions: ["ES", "MX", "AR"]
 *                 content_type: "url"
 *                 content_value: "https://example.com/es"
 *                 priority: 1
 *     responses:
 *       201:
 *         description: Content rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QRContentRule'
 *       400:
 *         description: Invalid rule data or subscription limits exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       enum: [VALIDATION_ERROR, SUBSCRIPTION_LIMIT_EXCEEDED, RULE_LIMIT_EXCEEDED]
 *                     message:
 *                       type: string
 *                     details:
 *                       type: array
 *                       items:
 *                         type: string
 *   get:
 *     summary: Get all content rules for QR code
 *     description: Retrieve all content rules for a specific QR code ordered by priority
 *     tags: [Advanced QR Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *       - in: query
 *         name: include_stats
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include rule statistics
 *     responses:
 *       200:
 *         description: List of content rules
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/QRContentRule'
 *                       - type: object
 *                         properties:
 *                           statistics:
 *                             $ref: '#/components/schemas/QRContentRuleStats'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     total_rules:
 *                       type: integer
 *                     subscription_limits:
 *                       type: object
 *                       properties:
 *                         max_rules:
 *                           type: integer
 *                         current_count:
 *                           type: integer
 *                         remaining:
 *                           type: integer
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'

/**
 * @swagger
 * /api/qr/rules/{ruleId}:
 *   put:
 *     summary: Update an existing content rule
 *     description: Modify a content rule's configuration, priority, or active status
 *     tags: [Advanced QR Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Content rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule_name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               rule_data:
 *                 type: object
 *                 description: Updated rule configuration
 *               content_type:
 *                 type: string
 *                 enum: [url, text, landing_page]
 *               content_value:
 *                 type: string
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Content rule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QRContentRule'
 *       404:
 *         description: Content rule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete a content rule
 *     description: Remove a content rule from the QR code
 *     tags: [Advanced QR Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Content rule ID
 *     responses:
 *       200:
 *         description: Content rule deleted successfully
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
 *                   example: "Content rule deleted successfully"
 *       404:
 *         description: Content rule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'

/**
 * @swagger
 * /api/qr/{id}/resolve:
 *   post:
 *     summary: 🚀 Resolve dynamic content for QR code
 *     description: |
 *       **The core feature of Advanced QR!** 
 *       
 *       This endpoint evaluates all content rules for a QR code against the provided scan context 
 *       and returns the most appropriate content. Rules are evaluated in priority order, and the 
 *       first matching rule's content is returned.
 *       
 *       **Use Cases:**
 *       - 📱 Serve mobile app download links to mobile users, website to desktop
 *       - 🌍 Show localized content based on user's country/language  
 *       - ⏰ Display different menus during lunch vs dinner hours
 *       - 📍 Provide location-specific information with geo-fencing
 *       
 *       **How it works:**
 *       1. All active rules for the QR code are retrieved
 *       2. Rules are sorted by priority (highest first)
 *       3. Each rule is evaluated against the scan context
 *       4. First matching rule's content is returned
 *       5. If no rules match, fallback to QR code's default content
 *       6. Analytics are tracked for performance monitoring
 *     tags: [Advanced QR Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResolutionRequest'
 *           examples:
 *             mobile_user:
 *               summary: Mobile User from US
 *               value:
 *                 device_type: "mobile"
 *                 country: "US"
 *                 language: "en"
 *                 timestamp: "2025-11-10T15:30:00Z"
 *             international_user:
 *               summary: Desktop User from Germany
 *               value:
 *                 device_type: "desktop"
 *                 country: "DE"
 *                 language: "de"
 *                 timestamp: "2025-11-10T09:45:00Z"
 *             geofenced_user:
 *               summary: User Near Store Location
 *               value:
 *                 device_type: "mobile"
 *                 country: "US"
 *                 language: "en"
 *                 location:
 *                   latitude: 40.7589
 *                   longitude: -73.9851
 *                 timestamp: "2025-11-10T12:00:00Z"
 *             business_hours:
 *               summary: User During Business Hours
 *               value:
 *                 device_type: "mobile"
 *                 country: "US"
 *                 language: "en"
 *                 timestamp: "2025-11-10T14:30:00Z"
 *     responses:
 *       200:
 *         description: Dynamic content resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResolutionResult'
 *             examples:
 *               matched_rule:
 *                 summary: Rule Matched - Dynamic Content
 *                 value:
 *                   success: true
 *                   data:
 *                     matched_rule:
 *                       id: "123e4567-e89b-12d3-a456-426614174000"
 *                       rule_name: "Mobile Users - App Store"
 *                       rule_type: "device"
 *                       priority: 1
 *                       match_score: 1.0
 *                     content:
 *                       type: "url"
 *                       value: "https://app.example.com/download"
 *                       metadata:
 *                         optimized_for: "mobile"
 *                         campaign: "mobile_app_promotion"
 *                     fallback_used: false
 *                     execution_time_ms: 12
 *                     rules_evaluated: 3
 *               fallback_content:
 *                 summary: No Rules Matched - Fallback Used
 *                 value:
 *                   success: true
 *                   data:
 *                     matched_rule: null
 *                     content:
 *                       type: "url"
 *                       value: "https://example.com"
 *                       metadata:
 *                         source: "qr_default_content"
 *                     fallback_used: true
 *                     execution_time_ms: 8
 *                     rules_evaluated: 2
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Content resolution failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "RESOLUTION_ERROR"
 *                     message:
 *                       type: string
 *                       example: "Failed to resolve content for QR code"
 *                     execution_time_ms:
 *                       type: integer
 *                       example: 5000
 */