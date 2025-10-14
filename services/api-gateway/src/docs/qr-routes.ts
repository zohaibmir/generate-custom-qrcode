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
 *           enum: [free, pro, business, enterprise]
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
 *           enum: [free, pro, business, enterprise]
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
 */