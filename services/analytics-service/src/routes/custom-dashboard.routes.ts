import { Router } from 'express';
import { CustomDashboardController, dashboardValidation } from '../controllers/custom-dashboard.controller';
import { IDependencyContainer } from '../interfaces';

/**
 * Custom Dashboard Routes
 * 
 * All routes for dashboard management, widgets, and real-time data
 */
export function createCustomDashboardRoutes(container: IDependencyContainer): Router {
  const router = Router();
  const controller = new CustomDashboardController(container);

  // Dashboard CRUD Operations
  router.post('/', 
    dashboardValidation.create, 
    controller.createDashboard
  );

  router.get('/', 
    dashboardValidation.list, 
    controller.getUserDashboards
  );

  router.get('/:id', 
    dashboardValidation.get, 
    controller.getDashboard
  );

  router.put('/:id', 
    dashboardValidation.update, 
    controller.updateDashboard
  );

  router.delete('/:id', 
    dashboardValidation.get, 
    controller.deleteDashboard
  );

  // Dashboard Templates
  router.get('/templates', 
    controller.getDashboardTemplates
  );

  router.post('/templates/:templateId/create', 
    controller.createFromTemplate
  );

  // Widget Operations
  router.get('/widgets/:widgetId/data', 
    controller.getWidgetData
  );

  router.get('/widget-templates', 
    controller.getWidgetTemplates
  );

  // Dashboard Actions
  router.post('/:id/duplicate', 
    controller.duplicateDashboard
  );

  router.get('/:id/export', 
    controller.exportDashboard
  );

  router.get('/:id/analytics', 
    controller.getDashboardAnalytics
  );

  return router;
}

/**
 * WebSocket setup for real-time dashboard updates
 */
export function setupDashboardWebSocket(io: any, container: IDependencyContainer): any {
  const dashboardNamespace = io.of('/dashboards');

  dashboardNamespace.on('connection', (socket: any) => {
    console.log('Dashboard client connected:', socket.id);

    // Join dashboard room for real-time updates
    socket.on('join-dashboard', (dashboardId: string) => {
      socket.join(`dashboard-${dashboardId}`);
      console.log(`Client ${socket.id} joined dashboard ${dashboardId}`);
    });

    // Leave dashboard room
    socket.on('leave-dashboard', (dashboardId: string) => {
      socket.leave(`dashboard-${dashboardId}`);
      console.log(`Client ${socket.id} left dashboard ${dashboardId}`);
    });

    // Request widget data refresh
    socket.on('refresh-widget', async (data: { widgetId: string; dashboardId: string }) => {
      try {
        // Emit refresh event to all clients in the dashboard room
        dashboardNamespace.to(`dashboard-${data.dashboardId}`).emit('widget-refresh', {
          widgetId: data.widgetId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to refresh widget:', error);
        socket.emit('error', { message: 'Failed to refresh widget data' });
      }
    });

    // Handle widget data updates
    socket.on('widget-data-update', (data: { widgetId: string; dashboardId: string; data: any }) => {
      // Broadcast updated data to all clients in the dashboard room
      socket.to(`dashboard-${data.dashboardId}`).emit('widget-data', {
        widgetId: data.widgetId,
        data: data.data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle dashboard layout changes
    socket.on('dashboard-layout-change', (data: { dashboardId: string; layout: any }) => {
      // Broadcast layout changes to other clients
      socket.to(`dashboard-${data.dashboardId}`).emit('layout-changed', {
        layout: data.layout,
        timestamp: new Date().toISOString(),
        changedBy: socket.id
      });
    });

    // Handle real-time alerts
    socket.on('subscribe-alerts', (dashboardId: string) => {
      socket.join(`alerts-${dashboardId}`);
      console.log(`Client ${socket.id} subscribed to alerts for dashboard ${dashboardId}`);
    });

    socket.on('disconnect', () => {
      console.log('Dashboard client disconnected:', socket.id);
    });
  });

  // Utility functions for broadcasting
  return {
    broadcastWidgetData: (dashboardId: string, widgetId: string, data: any) => {
      dashboardNamespace.to(`dashboard-${dashboardId}`).emit('widget-data', {
        widgetId,
        data,
        timestamp: new Date().toISOString()
      });
    },
    broadcastAlert: (dashboardId: string, alert: any) => {
      dashboardNamespace.to(`alerts-${dashboardId}`).emit('dashboard-alert', {
        ...alert,
        timestamp: new Date().toISOString()
      });
    }
  };
}