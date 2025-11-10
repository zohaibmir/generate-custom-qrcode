/**
 * Team Collaboration Routes
 * 
 * HTTP routes for team collaboration features including QR libraries,
 * permissions management, and team dashboard functionality.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Router } from 'express';
import { TeamCollaborationController } from '../controllers/team-collaboration.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function createTeamCollaborationRoutes(controller: TeamCollaborationController): Router {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // QR Libraries Management
  router.get('/libraries', controller.getQRLibraries.bind(controller));
  router.post('/libraries', controller.createQRLibrary.bind(controller));
  router.get('/libraries/:libraryId', controller.getQRLibrary.bind(controller));
  router.put('/libraries/:libraryId', controller.updateQRLibrary.bind(controller));
  router.delete('/libraries/:libraryId', controller.deleteQRLibrary.bind(controller));

  // QR Library Items Management
  router.post('/libraries/:libraryId/items', controller.addQRsToLibrary.bind(controller));
  router.put('/libraries/:libraryId/items/:itemId', controller.updateLibraryItem.bind(controller));
  router.delete('/libraries/:libraryId/items/:itemId', controller.removeQRFromLibrary.bind(controller));

  // QR Permissions Management
  router.get('/qr-permissions/:qrCodeId', controller.getQRPermissions.bind(controller));
  router.put('/qr-permissions/:qrCodeId', controller.updateQRPermissions.bind(controller));
  router.post('/qr-permissions/check', controller.checkQRPermission.bind(controller));

  // Team Dashboard
  router.get('/dashboard/:organizationId', controller.getTeamDashboard.bind(controller));
  router.get('/dashboard/:organizationId/activity', controller.getTeamActivity.bind(controller));
  router.get('/dashboard/:organizationId/metrics/:metricType/history', controller.getMetricHistory.bind(controller));

  return router;
}