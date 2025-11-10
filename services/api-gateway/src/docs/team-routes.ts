/**
 * @swagger
 * /api/teams/organizations:
 *   get:
 *     summary: Get user's organizations
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's organizations
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
 *                         $ref: '#/components/schemas/Organization'
 *   post:
 *     summary: Create a new organization
 *     tags: [Teams]
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
 *                 description: Organization name
 *                 example: "Acme Corp"
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: "Leading software company"
 *               settings:
 *                 type: object
 *                 description: Organization settings
 *                 properties:
 *                   allowMemberInvites:
 *                     type: boolean
 *                     default: true
 *                   requireApproval:
 *                     type: boolean
 *                     default: false
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/teams/organizations/{organizationId}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update organization
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Org Name"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowMemberInvites:
 *                     type: boolean
 *                   requireApproval:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Organization'
 *   delete:
 *     summary: Delete organization
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /api/teams/members/{organizationId}:
 *   get:
 *     summary: Get organization members
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of organization members
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
 *                         $ref: '#/components/schemas/Member'
 */

/**
 * @swagger
 * /api/teams/members/{organizationId}/invite:
 *   post:
 *     summary: Invite member to organization
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the user to invite
 *                 example: "john@example.com"
 *               role:
 *                 type: string
 *                 enum: [member, admin, owner]
 *                 description: Role to assign to the member
 *                 example: "member"
 *               message:
 *                 type: string
 *                 description: Optional invitation message
 *                 example: "Welcome to our team!"
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Invitation'
 */

/**
 * @swagger
 * /api/teams/members/{organizationId}/{memberId}:
 *   put:
 *     summary: Update member role
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, admin, owner]
 *                 description: New role for the member
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Member'
 *   delete:
 *     summary: Remove member from organization
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Member ID
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /api/teams/invitations:
 *   get:
 *     summary: Get pending invitations for current user
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending invitations
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
 *                         $ref: '#/components/schemas/Invitation'
 */

/**
 * @swagger
 * /api/teams/invitations/{invitationId}/accept:
 *   post:
 *     summary: Accept invitation
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Member'
 */

/**
 * @swagger
 * /api/teams/invitations/{invitationId}/resend:
 *   post:
 *     summary: Resend invitation
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /api/teams/invitations/{invitationId}:
 *   delete:
 *     summary: Cancel invitation
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /api/teams/libraries:
 *   get:
 *     summary: Get QR libraries for user's organizations
 *     description: Retrieve all QR libraries that the user has access to across their organizations
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific organization
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: List of QR libraries
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
 *                         $ref: '#/components/schemas/QRLibrary'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *   post:
 *     summary: Create new QR library
 *     description: Create a new QR library within an organization
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - name
 *             properties:
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Organization ID where library will be created
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Library name
 *                 example: "Marketing QR Codes"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional library description
 *                 example: "QR codes for marketing campaigns and promotions"
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Whether library is accessible to all organization members
 *     responses:
 *       201:
 *         description: QR library created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRLibrary'
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Library name already exists in organization

/**
 * @swagger
 * /api/teams/libraries/{libraryId}:
 *   get:
 *     summary: Get QR library with items
 *     description: Retrieve a specific QR library with all its items
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Library ID
 *       - in: query
 *         name: includeItems
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include QR items in response
 *     responses:
 *       200:
 *         description: QR library details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRLibraryWithItems'
 *       404:
 *         description: Library not found
 *       403:
 *         description: Access denied
 *   put:
 *     summary: Update QR library
 *     description: Update library metadata (requires admin or owner role)
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Library ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Library updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QRLibrary'
 *   delete:
 *     summary: Delete QR library
 *     description: Delete library and all its items (requires admin or owner role)
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Library ID
 *     responses:
 *       200:
 *         description: Library deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'

/**
 * @swagger
 * /api/teams/libraries/{libraryId}/items:
 *   post:
 *     summary: Add QR codes to library
 *     description: Add one or more QR codes to a library
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Library ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodes
 *             properties:
 *               qrCodes:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required:
 *                     - qrCodeId
 *                   properties:
 *                     qrCodeId:
 *                       type: string
 *                       format: uuid
 *                       description: QR code ID to add
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Optional tags for organization
 *                     notes:
 *                       type: string
 *                       maxLength: 500
 *                       description: Optional notes about the QR code
 *     responses:
 *       201:
 *         description: QR codes added to library successfully
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
 *                         addedCount:
 *                           type: integer
 *                         skippedCount:
 *                           type: integer
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/QRLibraryItem'

/**
 * @swagger
 * /api/teams/libraries/{libraryId}/items/{itemId}:
 *   put:
 *     summary: Update library item
 *     description: Update tags or notes for a QR code in the library
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Library item updated successfully
 *   delete:
 *     summary: Remove QR code from library
 *     description: Remove a QR code from the library (does not delete the QR code itself)
 *     tags: [QR Libraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: libraryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: QR code removed from library successfully

/**
 * @swagger
 * /api/teams/qr-permissions/{qrCodeId}:
 *   get:
 *     summary: Get QR code permissions
 *     description: Get fine-grained access control permissions for a QR code
 *     tags: [QR Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR Code ID
 *     responses:
 *       200:
 *         description: QR code permissions
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
 *                         qrCodeId:
 *                           type: string
 *                           format: uuid
 *                         organizationId:
 *                           type: string
 *                           format: uuid
 *                         isPublic:
 *                           type: boolean
 *                         permissions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/QRPermission'
 *   put:
 *     summary: Update QR code permissions
 *     description: Set fine-grained permissions for a QR code (requires admin or owner)
 *     tags: [QR Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               isPublic:
 *                 type: boolean
 *                 description: Whether QR code is accessible to all organization members
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - permission
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     permission:
 *                       type: string
 *                       enum: [read, edit, admin]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Optional expiration time
 *     responses:
 *       200:
 *         description: Permissions updated successfully

/**
 * @swagger
 * /api/teams/qr-permissions/check:
 *   post:
 *     summary: Check QR access permission
 *     description: Check if user has specific permission for a QR code
 *     tags: [QR Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeId
 *               - permission
 *             properties:
 *               qrCodeId:
 *                 type: string
 *                 format: uuid
 *               permission:
 *                 type: string
 *                 enum: [read, edit, admin]
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional - defaults to current user
 *     responses:
 *       200:
 *         description: Permission check result
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
 *                         hasPermission:
 *                           type: boolean
 *                         reason:
 *                           type: string
 *                           description: Explanation if permission denied
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           description: Permission expiration if applicable

/**
 * @swagger
 * /api/teams/dashboard/{organizationId}:
 *   get:
 *     summary: Get team dashboard data
 *     description: Get comprehensive team dashboard with metrics and activity
 *     tags: [Team Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for metrics
 *       - in: query
 *         name: includeActivity
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include recent activity feed
 *     responses:
 *       200:
 *         description: Team dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TeamDashboard'

/**
 * @swagger
 * /api/teams/dashboard/{organizationId}/activity:
 *   get:
 *     summary: Get team activity feed
 *     description: Get paginated team activity feed for organization
 *     tags: [Team Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: activityType
 *         schema:
 *           type: string
 *           enum: [qr_created, qr_updated, qr_scanned, member_invited, member_joined, library_created]
 *         description: Filter by activity type
 *     responses:
 *       200:
 *         description: Team activity feed
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
 *                         $ref: '#/components/schemas/TeamActivity'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'

/**
 * @swagger
 * /api/teams/dashboard/{organizationId}/metrics/{metricType}/history:
 *   get:
 *     summary: Get metric history
 *     description: Get historical data for a specific metric
 *     tags: [Team Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: metricType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [qr_codes_count, total_scans, active_members, library_count]
 *         description: Type of metric to retrieve
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 7
 *           maximum: 365
 *           default: 30
 *         description: Number of days to retrieve
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Data point granularity
 *     responses:
 *       200:
 *         description: Metric history data
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
 *                         $ref: '#/components/schemas/MetricDataPoint'
 */