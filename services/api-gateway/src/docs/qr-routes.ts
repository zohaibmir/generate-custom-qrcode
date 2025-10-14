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