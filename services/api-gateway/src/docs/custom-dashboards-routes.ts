/**
 * @swagger
 * components:
 *   schemas:
 *     CustomDashboard:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique dashboard identifier
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Dashboard name
 *           example: "Marketing Performance Dashboard"
 *         description:
 *           type: string
 *           description: Dashboard description
 *           example: "Comprehensive view of all marketing campaigns"
 *         layout:
 *           type: object
 *           description: Dashboard layout configuration
 *           properties:
 *             grid_size:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: integer
 *                   example: 12
 *                 columns:
 *                   type: integer
 *                   example: 24
 *             widgets:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DashboardWidget'
 *         is_public:
 *           type: boolean
 *           description: Whether dashboard is publicly viewable
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     DashboardWidget:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         dashboard_id:
 *           type: string
 *           format: uuid
 *         widget_type:
 *           type: string
 *           enum: [chart, metric, table, heatmap, funnel, gauge, text]
 *         title:
 *           type: string
 *           example: "Total Scans"
 *         position:
 *           type: object
 *           properties:
 *             x:
 *               type: integer
 *             y:
 *               type: integer
 *             width:
 *               type: integer
 *             height:
 *               type: integer
 *         configuration:
 *           type: object
 *           description: Widget-specific configuration
 *         data_source:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [qr_analytics, campaign_metrics, user_stats, realtime_data]
 *             filters:
 *               type: object
 *         refresh_interval:
 *           type: integer
 *           description: Auto-refresh interval in seconds
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     DashboardTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "QR Campaign Overview"
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [marketing, analytics, performance, executive]
 *         template_data:
 *           type: object
 *           description: Pre-configured dashboard layout and widgets
 *         preview_image:
 *           type: string
 *           description: Template preview image URL
 *         is_premium:
 *           type: boolean
 *           description: Whether template requires premium subscription
 */

/**
 * @swagger
 * /api/analytics/dashboards:
 *   get:
 *     summary: Get user's custom dashboards
 *     tags: [Custom Dashboards]
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
 *         description: Number of dashboards per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search dashboards by name
 *     responses:
 *       200:
 *         description: List of user dashboards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomDashboard'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *   post:
 *     summary: Create a new custom dashboard
 *     tags: [Custom Dashboards]
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
 *                 example: "Q4 Campaign Performance"
 *               description:
 *                 type: string
 *                 example: "Year-end marketing campaign analytics"
 *               template_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional template to use as base
 *               is_public:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Dashboard created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CustomDashboard'
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}:
 *   get:
 *     summary: Get dashboard details with widgets
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Dashboard ID
 *     responses:
 *       200:
 *         description: Dashboard details with widgets and data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/CustomDashboard'
 *                     - type: object
 *                       properties:
 *                         widgets:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/DashboardWidget'
 *                               - type: object
 *                                 properties:
 *                                   data:
 *                                     type: object
 *                                     description: Widget data based on data source
 *   put:
 *     summary: Update dashboard configuration
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               layout:
 *                 type: object
 *               is_public:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Dashboard updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CustomDashboard'
 *   delete:
 *     summary: Delete dashboard
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Dashboard deleted successfully
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}/widgets:
 *   post:
 *     summary: Add widget to dashboard
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
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
 *               - widget_type
 *               - title
 *               - position
 *               - data_source
 *             properties:
 *               widget_type:
 *                 type: string
 *                 enum: [chart, metric, table, heatmap, funnel, gauge, text]
 *               title:
 *                 type: string
 *               position:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: integer
 *                   y:
 *                     type: integer
 *                   width:
 *                     type: integer
 *                   height:
 *                     type: integer
 *               configuration:
 *                 type: object
 *               data_source:
 *                 type: object
 *               refresh_interval:
 *                 type: integer
 *                 default: 300
 *     responses:
 *       201:
 *         description: Widget added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardWidget'
 */

/**
 * @swagger
 * /api/analytics/dashboards/templates:
 *   get:
 *     summary: Get dashboard templates
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [marketing, analytics, performance, executive]
 *         description: Filter templates by category
 *     responses:
 *       200:
 *         description: Available dashboard templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DashboardTemplate'
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}/export:
 *   get:
 *     summary: Export dashboard as PDF or image
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, png, svg]
 *           default: pdf
 *       - in: query
 *         name: include_data
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include raw data in export
 *     responses:
 *       200:
 *         description: Exported dashboard file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}/share:
 *   post:
 *     summary: Create shareable dashboard link
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
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
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 description: Link expiration date
 *               password_protected:
 *                 type: boolean
 *                 default: false
 *               allowed_ips:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IP whitelist for access
 *     responses:
 *       201:
 *         description: Shareable link created
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
 *                     share_url:
 *                       type: string
 *                       example: "https://api.example.com/shared/dashboard/abc123"
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     access_count:
 *                       type: integer
 */