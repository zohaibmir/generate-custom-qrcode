/**
 * @fileoverview Clean Architecture Authentication & User Management API Documentation
 * This file documents the Clean Architecture endpoints proxied through the API Gateway
 * Authentication routes: /api/auth/* -> user-service /auth/*
 * User routes: /api/users/* -> user-service /users/*
 * Subscription routes: /api/subscription/* -> user-service /subscription/*
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: |
 *       Creates a new user account with Clean Architecture principles.
 *       - Validates input using proper validation middleware
 *       - Uses bcrypt for secure password hashing
 *       - Generates JWT token with proper issuer for API Gateway compatibility
 *       - Initializes user with free subscription tier
 *       - Returns JWT token for immediate authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9_-]+$'
 *                 description: Username (alphanumeric, underscore, hyphen only)
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (minimum 8 characters)
 *                 example: SecurePass123!
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's first name
 *                 example: John
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's last name
 *                 example: Doe
 *           example:
 *             username: john_doe
 *             email: john.doe@example.com
 *             password: SecurePass123!
 *             firstName: John
 *             lastName: Doe
 *     responses:
 *       201:
 *         description: User successfully registered
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
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       description: JWT token with issuer 'qr-saas-api-gateway'
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validation_error:
 *                 summary: Validation Error
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   details:
 *                     - field: email
 *                       message: Invalid email format
 *               duplicate_user:
 *                 summary: Duplicate User
 *                 value:
 *                   success: false
 *                   error: Username or email already exists
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user and get JWT token
 *     description: |
 *       Authenticates user credentials and returns JWT token.
 *       - Validates credentials using bcrypt password comparison
 *       - Generates JWT token with issuer 'qr-saas-api-gateway' for API Gateway compatibility
 *       - Includes user information and current subscription tier in response
 *       - Token is required for accessing protected endpoints
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: SecurePass123!
 *           example:
 *             email: john.doe@example.com
 *             password: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       description: JWT token for API authentication
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Invalid credentials
 *       400:
 *         description: Bad request - missing required fields
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
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: |
 *       Initiates password reset process for a user account.
 *       - Validates email address exists in system
 *       - Generates secure reset token with expiration
 *       - Sends password reset email with reset link
 *       - Tokens expire after 1 hour for security
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the account to reset
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
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
 *                   example: Password reset email sent
 *       404:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Email not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password using reset token
 *     description: |
 *       Completes password reset process using a valid reset token.
 *       - Validates reset token and expiration
 *       - Updates password with secure bcrypt hashing
 *       - Invalidates reset token after use
 *       - Returns success confirmation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: abc123def456ghi789
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password successfully reset
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
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_token:
 *                 summary: Invalid Token
 *                 value:
 *                   success: false
 *                   error: Invalid reset token
 *               expired_token:
 *                 summary: Expired Token
 *                 value:
 *                   success: false
 *                   error: Reset token has expired
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: |
 *       Retrieves the authenticated user's profile information.
 *       - Requires valid JWT token in Authorization header
 *       - Returns complete user profile including subscription details
 *       - Uses Clean Architecture user repository pattern
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             subscriptionTier:
 *                               type: string
 *                               enum: [free, starter, professional, enterprise]
 *                               example: professional
 *                             memberSince:
 *                               type: string
 *                               format: date-time
 *                               example: 2024-01-15T10:30:00Z
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Unauthorized access
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: |
 *       Updates the authenticated user's profile information.
 *       - Requires valid JWT token in Authorization header
 *       - Allows updating non-security fields (name, preferences)
 *       - Email and username changes require additional verification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 example: Doe
 *               preferences:
 *                 type: object
 *                 description: User preferences (stored as JSONB)
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, auto]
 *                     example: dark
 *                   language:
 *                     type: string
 *                     example: en-US
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                         example: true
 *                       sms:
 *                         type: boolean
 *                         example: false
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

export const cleanArchAuthSchemas = {
  User: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Unique user identifier'
      },
      username: {
        type: 'string',
        description: 'User username'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      firstName: {
        type: 'string',
        nullable: true,
        description: 'User first name'
      },
      lastName: {
        type: 'string',
        nullable: true,
        description: 'User last name'
      },
      isActive: {
        type: 'boolean',
        description: 'Whether user account is active'
      },
      subscriptionTier: {
        type: 'string',
        enum: ['free', 'starter', 'professional', 'enterprise'],
        description: 'Current subscription tier'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    },
    example: {
      id: 1,
      username: 'john_doe',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      subscriptionTier: 'professional',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    }
  },
  Error: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false
      },
      error: {
        type: 'string',
        description: 'Error message'
      },
      details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'Field name causing the error'
            },
            message: {
              type: 'string',
              description: 'Specific error message for the field'
            }
          }
        },
        description: 'Detailed validation errors (optional)'
      }
    }
  }
};