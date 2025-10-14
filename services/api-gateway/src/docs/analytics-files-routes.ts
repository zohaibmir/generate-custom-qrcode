/**
 * @swagger
 * /api/analytics/scan:
 *   post:
 *     summary: Track QR code scan event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrId
 *               - scanData
 *             properties:
 *               qrId:
 *                 type: string
 *                 format: uuid
 *                 description: QR code ID that was scanned
 *               scanData:
 *                 type: object
 *                 required:
 *                   - userAgent
 *                   - ip
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                     description: User agent string from browser
 *                     example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
 *                   ip:
 *                     type: string
 *                     description: IP address of scanner
 *                     example: "192.168.1.1"
 *                   location:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                         example: "San Francisco"
 *                       country:
 *                         type: string
 *                         example: "US"
 *                       latitude:
 *                         type: number
 *                         example: 37.7749
 *                       longitude:
 *                         type: number
 *                         example: -122.4194
 *                   referrer:
 *                     type: string
 *                     description: Referrer URL
 *                     example: "https://google.com"
 *     responses:
 *       200:
 *         description: Scan event tracked successfully
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
 *                         scanId:
 *                           type: string
 *                           format: uuid
 *                           description: Unique scan event ID
 *                         qrId:
 *                           type: string
 *                           format: uuid
 *                         scannedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid scan data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/analytics/qr/{qrId}:
 *   get:
 *     summary: Get analytics for specific QR code
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, 1y]
 *           default: 7d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: QR code analytics data
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
 *                         qrId:
 *                           type: string
 *                           format: uuid
 *                         totalScans:
 *                           type: number
 *                         uniqueVisitors:
 *                           type: number
 *                         timeframe:
 *                           type: string
 *                         scansByDay:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               scans:
 *                                 type: number
 *                         topLocations:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               city:
 *                                 type: string
 *                               country:
 *                                 type: string
 *                               count:
 *                                 type: number
 *                         topReferrers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               referrer:
 *                                 type: string
 *                               count:
 *                                 type: number
 */

/**
 * @swagger
 * /api/analytics/user/summary:
 *   get:
 *     summary: Get user analytics summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for summary
 *     responses:
 *       200:
 *         description: User analytics summary
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
 *                         totalQRCodes:
 *                           type: number
 *                         totalScans:
 *                           type: number
 *                         uniqueVisitors:
 *                           type: number
 *                         activeQRCodes:
 *                           type: number
 *                         averageScansPerQR:
 *                           type: number
 *                         topPerformingQRs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               qrId:
 *                                 type: string
 *                                 format: uuid
 *                               title:
 *                                 type: string
 *                               scans:
 *                                 type: number
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, 1y]
 *           default: 7d
 *         description: Time period for dashboard
 *     responses:
 *       200:
 *         description: Dashboard analytics data
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
 *                         overview:
 *                           type: object
 *                           properties:
 *                             totalScans:
 *                               type: number
 *                             uniqueVisitors:
 *                               type: number
 *                             totalQRCodes:
 *                               type: number
 *                             activeQRCodes:
 *                               type: number
 *                         trends:
 *                           type: object
 *                           properties:
 *                             scansByDay:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date
 *                                   scans:
 *                                     type: number
 *                         demographics:
 *                           type: object
 *                           properties:
 *                             topCountries:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   country:
 *                                     type: string
 *                                   count:
 *                                     type: number
 *                             topCities:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   city:
 *                                     type: string
 *                                   count:
 *                                     type: number
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               type:
 *                 type: string
 *                 enum: [qr-logo, avatar, document]
 *                 description: Type of file upload
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileUpload'
 *       400:
 *         description: Invalid file or upload type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileUpload'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/files/user:
 *   get:
 *     summary: Get user's uploaded files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of files per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [qr-logo, avatar, document]
 *         description: Filter by upload type
 *     responses:
 *       200:
 *         description: List of user's files
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
 *                         $ref: '#/components/schemas/FileUpload'
 */