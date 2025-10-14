/**
 * @swagger
 * components:
 *   schemas:
 *     QRTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique template identifier
 *           example: restaurant-menu
 *         name:
 *           type: string
 *           description: Human-readable template name
 *           example: Restaurant Menu
 *         description:
 *           type: string
 *           description: Template description
 *           example: Create a QR code that links to your digital menu
 *         category:
 *           type: string
 *           enum: [business, marketing, hospitality, events, social, education, personal, ecommerce, healthcare, transportation]
 *           description: Template category
 *           example: hospitality
 *         type:
 *           type: string
 *           enum: [url, text, email, phone, sms, wifi, location, vcard]
 *           description: QR code type
 *           example: url
 *         icon:
 *           type: string
 *           description: Template icon (emoji or unicode)
 *           example: 🍽️
 *         isPopular:
 *           type: boolean
 *           description: Whether template is marked as popular
 *           example: true
 *         isPremium:
 *           type: boolean
 *           description: Whether template requires premium subscription
 *           example: false
 *         requiredSubscriptionTier:
 *           type: string
 *           enum: [free, pro, business, enterprise]
 *           description: Minimum subscription tier required
 *           example: free
 *         defaultConfig:
 *           type: object
 *           description: Default QR design configuration
 *         fields:
 *           type: array
 *           description: Template form fields
 *           items:
 *             $ref: '#/components/schemas/QRTemplateField'
 *         contentStructure:
 *           type: object
 *           description: Template content structure with placeholders
 *         examples:
 *           type: array
 *           description: Usage examples
 *           items:
 *             $ref: '#/components/schemas/QRTemplateExample'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - name
 *         - description
 *         - category
 *         - type
 *         - fields
 *
 *     QRTemplateField:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: name
 *         name:
 *           type: string
 *           example: name
 *         label:
 *           type: string
 *           example: QR Code Name
 *         type:
 *           type: string
 *           enum: [text, email, url, phone, textarea, select, number, password]
 *           example: text
 *         required:
 *           type: boolean
 *           example: true
 *         placeholder:
 *           type: string
 *           example: e.g., Main Menu QR
 *         validation:
 *           $ref: '#/components/schemas/QRTemplateFieldValidation'
 *         options:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QRTemplateFieldOption'
 *         defaultValue:
 *           type: string
 *         description:
 *           type: string
 *       required:
 *         - id
 *         - name
 *         - label
 *         - type
 *         - required
 *
 *     QRTemplateFieldValidation:
 *       type: object
 *       properties:
 *         minLength:
 *           type: number
 *           example: 3
 *         maxLength:
 *           type: number
 *           example: 50
 *         pattern:
 *           type: string
 *           example: ^https?://.+
 *         min:
 *           type: number
 *         max:
 *           type: number
 *         customValidator:
 *           type: string
 *
 *     QRTemplateFieldOption:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           example: WPA
 *         label:
 *           type: string
 *           example: WPA/WPA2
 *         description:
 *           type: string
 *       required:
 *         - value
 *         - label
 *
 *     QRTemplateExample:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Pizza Palace Menu
 *         description:
 *           type: string
 *           example: Digital menu for a pizza restaurant
 *         data:
 *           type: object
 *         preview:
 *           type: string
 *           description: Preview URL or description
 *       required:
 *         - name
 *         - description
 *         - data
 */

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Get all QR templates
 *     description: Retrieve all available QR code templates organized by category with examples and configuration options
 *     tags: [Templates]
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Filter templates by category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [business, marketing, hospitality, events, social, education, personal, ecommerce, healthcare, transportation]
 *       - name: tier
 *         in: query
 *         description: Filter templates by subscription tier
 *         required: false
 *         schema:
 *           type: string
 *           enum: [free, pro, business, enterprise]
 *       - name: popular
 *         in: query
 *         description: Show only popular templates
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
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
 *                     $ref: '#/components/schemas/QRTemplate'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     total:
 *                       type: number
 *                       example: 5
 *             examples:
 *               success:
 *                 summary: Successful template retrieval
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: restaurant-menu
 *                       name: Restaurant Menu
 *                       description: Create a QR code that links to your digital menu
 *                       category: hospitality
 *                       type: url
 *                       icon: 🍽️
 *                       isPopular: true
 *                       isPremium: false
 *                       requiredSubscriptionTier: free
 *                   metadata:
 *                     timestamp: 2024-10-14T12:00:00Z
 *                     total: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/templates/category/{category}:
 *   get:
 *     summary: Get templates by category
 *     description: Retrieve QR code templates filtered by specific category
 *     tags: [Templates]
 *     parameters:
 *       - name: category
 *         in: path
 *         required: true
 *         description: Template category to filter by
 *         schema:
 *           type: string
 *           enum: [business, marketing, hospitality, events, social, education, personal, ecommerce, healthcare, transportation]
 *     responses:
 *       200:
 *         description: Category templates retrieved successfully
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
 *                     $ref: '#/components/schemas/QRTemplate'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     category:
 *                       type: string
 *                       example: hospitality
 *                     total:
 *                       type: number
 *                       example: 2
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     description: Retrieve detailed information about a specific QR code template including all configuration fields and examples
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *           example: restaurant-menu
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QRTemplate'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: TEMPLATE_NOT_FOUND
 *                 message: Template not found
 *                 statusCode: 404
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/templates/{id}/generate:
 *   post:
 *     summary: Generate QR code from template
 *     description: Create a QR code using a predefined template with custom data. The template provides validation and structure for the QR content.
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *           example: restaurant-menu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: QR code name
 *                 example: Pizza Palace Menu QR
 *               menuUrl:
 *                 type: string
 *                 format: url
 *                 description: URL to the digital menu
 *                 example: https://pizzapalace.com/menu
 *               restaurantName:
 *                 type: string
 *                 description: Restaurant name (optional)
 *                 example: Pizza Palace
 *               design:
 *                 type: object
 *                 description: Custom design overrides
 *             required:
 *               - name
 *               - menuUrl
 *           examples:
 *             restaurantMenu:
 *               summary: Restaurant menu QR
 *               value:
 *                 name: Pizza Palace Menu QR
 *                 menuUrl: https://pizzapalace.com/menu
 *                 restaurantName: Pizza Palace
 *                 design:
 *                   size: 350
 *                   color:
 *                     foreground: '#8B4513'
 *                     background: '#FFFFFF'
 *             wifiAccess:
 *               summary: WiFi access QR
 *               value:
 *                 name: Coffee Shop Guest WiFi
 *                 ssid: CoffeeShop_Guest
 *                 password: coffee123
 *                 security: WPA
 *     responses:
 *       201:
 *         description: QR code created successfully from template
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QRCode'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     templateId:
 *                       type: string
 *                       example: restaurant-menu
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Validation failed
 *                 statusCode: 400
 *                 details:
 *                   - Menu URL is required
 *                   - QR Code Name must be at least 3 characters
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/templates/{id}/validate:
 *   post:
 *     summary: Validate template data
 *     description: Validate form data against template requirements without creating a QR code. Useful for real-time form validation.
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *           example: restaurant-menu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Data to validate against template requirements
 *           example:
 *             name: Test Menu QR
 *             menuUrl: invalid-url
 *             restaurantName: ''
 *     responses:
 *       200:
 *         description: Validation completed
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
 *                     checkType:
 *                       type: string
 *                       example: TEMPLATE_VALIDATION
 *                     isValid:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: Validation failed
 *                     details:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - Menu URL format is invalid
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// QR Templates Documentation - All JSDoc comments above define the API structure