import { Pool } from 'pg';
import { serviceConfig, validateConfig } from './config';
import { getDatabaseConnection } from './config/database.config';
import { Logger } from './utils/logger';
import {
  OrganizationRepository,
  MemberRepository,
  InvitationRepository
} from './repositories';
import {
  TeamService,
  SlugGenerator,
  PermissionChecker,
  InvitationService,
  DependencyContainer,
  HealthChecker,
  TOKENS
} from './services';
import { DatabaseConnection } from './config/database.config';

export class Application {
  private container: DependencyContainer;
  private logger: Logger;
  private databaseConnection: DatabaseConnection;

  constructor() {
    // Validate configuration
    validateConfig();
    
    // Initialize logger
    this.logger = new Logger(serviceConfig.serviceName, serviceConfig.nodeEnv);
    
    // Initialize dependency container
    this.container = new DependencyContainer(this.logger);
    
    // Initialize database connection
    this.databaseConnection = getDatabaseConnection(this.logger);
  }

  async bootstrap(): Promise<DependencyContainer> {
    try {
      this.logger.info('Starting Team Service bootstrap process');

      // Test database connection
      const isDbConnected = await this.databaseConnection.testConnection();
      if (!isDbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Register infrastructure dependencies
      this.registerInfrastructure();

      // Register repositories
      this.registerRepositories();

      // Register services
      this.registerServices();

      this.logger.info('Team Service bootstrap completed successfully', {
        registeredDependencies: this.container.getRegisteredTokens()
      });

      return this.container;

    } catch (error: any) {
      this.logger.error('Team Service bootstrap failed', { error: error.message });
      throw error;
    }
  }

  private registerInfrastructure(): void {
    this.container.register(TOKENS.LOGGER, this.logger);
    this.container.register(TOKENS.DATABASE_CONNECTION, this.databaseConnection);
    
    const healthChecker = new HealthChecker(this.logger, this.databaseConnection);
    this.container.register(TOKENS.HEALTH_CHECKER, healthChecker);
  }

  private registerRepositories(): void {
    // Import repository implementations
    const { OrganizationRepository } = require('./repositories/organization.repository');
    const { MemberRepository } = require('./repositories/member.repository');
    const { InvitationRepository } = require('./repositories/invitation.repository');
    const { QRLibraryRepository } = require('./repositories/qr-library.repository');
    const { QRLibraryItemRepository } = require('./repositories/qr-library-item.repository');
    const { QRLibraryPermissionRepository } = require('./repositories/qr-library-permission.repository');
    const { QRAccessControlRepository } = require('./repositories/qr-access-control.repository');
    const { TeamDashboardRepository } = require('./repositories/team-dashboard.repository');

    // Create repository instances
    const organizationRepo = new OrganizationRepository(this.databaseConnection, this.logger);
    const memberRepo = new MemberRepository(this.databaseConnection, this.logger);
    const invitationRepo = new InvitationRepository(this.databaseConnection, this.logger);
    const qrLibraryRepo = new QRLibraryRepository(this.databaseConnection, this.logger);
    const qrLibraryItemRepo = new QRLibraryItemRepository(this.databaseConnection, this.logger);
    const qrLibraryPermissionRepo = new QRLibraryPermissionRepository(this.databaseConnection, this.logger);
    const qrAccessControlRepo = new QRAccessControlRepository(this.databaseConnection, this.logger);
    const teamDashboardRepo = new TeamDashboardRepository(this.databaseConnection, this.logger);

    this.container.register(TOKENS.ORGANIZATION_REPOSITORY, organizationRepo);
    this.container.register(TOKENS.MEMBER_REPOSITORY, memberRepo);
    this.container.register(TOKENS.INVITATION_REPOSITORY, invitationRepo);
    this.container.register(TOKENS.QR_LIBRARY_REPOSITORY, qrLibraryRepo);
    this.container.register(TOKENS.QR_LIBRARY_ITEM_REPOSITORY, qrLibraryItemRepo);
    this.container.register(TOKENS.QR_LIBRARY_PERMISSION_REPOSITORY, qrLibraryPermissionRepo);
    this.container.register(TOKENS.QR_ACCESS_CONTROL_REPOSITORY, qrAccessControlRepo);
    this.container.register(TOKENS.TEAM_DASHBOARD_REPOSITORY, teamDashboardRepo);
  }

  private registerServices(): void {
    // Utility services
    const slugGenerator = new SlugGenerator(this.logger);
    const permissionChecker = new PermissionChecker();
    const invitationService = new InvitationService(this.logger);

    this.container.register(TOKENS.SLUG_GENERATOR, slugGenerator);
    this.container.register(TOKENS.PERMISSION_CHECKER, permissionChecker);
    this.container.register(TOKENS.INVITATION_SERVICE, invitationService);

    // Import service implementations
    const { QRLibraryService } = require('./services/qr-library.service');
    const { QRPermissionService } = require('./services/qr-permission.service');
    const { TeamDashboardService } = require('./services/team-dashboard.service');
    
    // Create QR Library Service
    const qrLibraryService = new QRLibraryService(
      this.container.resolve(TOKENS.QR_LIBRARY_REPOSITORY),
      this.container.resolve(TOKENS.QR_LIBRARY_ITEM_REPOSITORY),
      this.container.resolve(TOKENS.QR_LIBRARY_PERMISSION_REPOSITORY),
      permissionChecker,
      this.logger
    );

    // Create QR Permission Service
    const qrPermissionService = new QRPermissionService(
      this.container.resolve(TOKENS.QR_ACCESS_CONTROL_REPOSITORY),
      this.container.resolve(TOKENS.MEMBER_REPOSITORY),
      this.logger
    );

    // Create Team Dashboard Service
    const teamDashboardService = new TeamDashboardService(
      this.container.resolve(TOKENS.TEAM_DASHBOARD_REPOSITORY),
      this.container.resolve(TOKENS.MEMBER_REPOSITORY),
      this.logger
    );

    this.container.register(TOKENS.QR_LIBRARY_SERVICE, qrLibraryService);
    this.container.register(TOKENS.QR_PERMISSION_SERVICE, qrPermissionService);
    this.container.register(TOKENS.TEAM_DASHBOARD_SERVICE, teamDashboardService);

    // Main business service
    const teamService = new TeamService(
      this.container.resolve(TOKENS.ORGANIZATION_REPOSITORY),
      this.container.resolve(TOKENS.MEMBER_REPOSITORY),
      this.container.resolve(TOKENS.INVITATION_REPOSITORY),
      this.logger,
      slugGenerator,
      invitationService,
      permissionChecker,
      qrLibraryService
    );

    this.container.register(TOKENS.TEAM_SERVICE, teamService);

    // Register controllers
    this.registerControllers();
  }

  private registerControllers(): void {
    // Import controllers
    const { OrganizationController } = require('./controllers/organization.controller');
    const { MemberController } = require('./controllers/member.controller');
    const { InvitationController } = require('./controllers/invitation.controller');
    const { HealthController } = require('./controllers/health.controller');
    const { TeamCollaborationController } = require('./controllers/team-collaboration.controller');

    // Create controller instances
    const organizationController = new OrganizationController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const memberController = new MemberController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const invitationController = new InvitationController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const healthController = new HealthController(
      this.container.resolve(TOKENS.HEALTH_CHECKER),
      this.logger
    );

    const teamCollaborationController = new TeamCollaborationController(
      this.container.resolve(TOKENS.QR_LIBRARY_SERVICE),
      this.container.resolve(TOKENS.QR_PERMISSION_SERVICE),
      this.container.resolve(TOKENS.TEAM_DASHBOARD_SERVICE),
      this.logger
    );

    // Register controllers in container
    this.container.register(TOKENS.ORGANIZATION_CONTROLLER, organizationController);
    this.container.register(TOKENS.MEMBER_CONTROLLER, memberController);
    this.container.register(TOKENS.INVITATION_CONTROLLER, invitationController);
    this.container.register(TOKENS.HEALTH_CONTROLLER, healthController);
    this.container.register(TOKENS.TEAM_COLLABORATION_CONTROLLER, teamCollaborationController);
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Team Service');

      // Close database connections
      await this.databaseConnection.close();

      // Clear dependency container
      this.container.clear();

      this.logger.info('Team Service shutdown completed');
    } catch (error: any) {
      this.logger.error('Error during Team Service shutdown', { error: error.message });
      throw error;
    }
  }

  getContainer(): DependencyContainer {
    return this.container;
  }
}

// Export singleton instance
export const application = new Application();