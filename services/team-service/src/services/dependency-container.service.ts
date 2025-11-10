import { IDependencyContainer, ILogger } from '../interfaces';

export class DependencyContainer implements IDependencyContainer {
  private container: Map<string, any> = new Map();
  private logger: ILogger | undefined;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  register<T>(token: string, instance: T): void {
    if (this.container.has(token)) {
      this.logger?.warn(`Overriding existing registration for token: ${token}`);
    }
    
    this.container.set(token, instance);
    this.logger?.debug(`Registered dependency: ${token}`);
  }

  resolve<T>(token: string): T {
    const instance = this.container.get(token);
    
    if (!instance) {
      const error = new Error(`Dependency not found: ${token}`);
      this.logger?.error(`Failed to resolve dependency: ${token}`);
      throw error;
    }
    
    this.logger?.debug(`Resolved dependency: ${token}`);
    return instance;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.container.keys());
  }

  has(token: string): boolean {
    return this.container.has(token);
  }

  clear(): void {
    const tokenCount = this.container.size;
    this.container.clear();
    this.logger?.info(`Cleared ${tokenCount} dependencies from container`);
  }

  // Utility method to register multiple dependencies at once
  registerAll(dependencies: Record<string, any>): void {
    Object.entries(dependencies).forEach(([token, instance]) => {
      this.register(token, instance);
    });
  }

  // Convenience getters for common dependencies
  getLogger(): ILogger {
    return this.resolve<ILogger>(TOKENS.LOGGER);
  }

  getOrganizationController(): any {
    return this.resolve(TOKENS.ORGANIZATION_CONTROLLER);
  }

  getMemberController(): any {
    return this.resolve(TOKENS.MEMBER_CONTROLLER);
  }

  getInvitationController(): any {
    return this.resolve(TOKENS.INVITATION_CONTROLLER);
  }

  getHealthController(): any {
    return this.resolve(TOKENS.HEALTH_CONTROLLER);
  }

  getTeamCollaborationController(): any {
    return this.resolve(TOKENS.TEAM_COLLABORATION_CONTROLLER);
  }
}

// Dependency injection tokens
export const TOKENS = {
  // Repositories
  ORGANIZATION_REPOSITORY: 'OrganizationRepository',
  MEMBER_REPOSITORY: 'MemberRepository',
  INVITATION_REPOSITORY: 'InvitationRepository',
  QR_LIBRARY_REPOSITORY: 'QRLibraryRepository',
  QR_LIBRARY_ITEM_REPOSITORY: 'QRLibraryItemRepository',
  QR_LIBRARY_PERMISSION_REPOSITORY: 'QRLibraryPermissionRepository',
  QR_ACCESS_CONTROL_REPOSITORY: 'QRAccessControlRepository',
  TEAM_DASHBOARD_REPOSITORY: 'TeamDashboardRepository',
  
  // Services
  TEAM_SERVICE: 'TeamService',
  QR_LIBRARY_SERVICE: 'QRLibraryService',
  QR_PERMISSION_SERVICE: 'QRPermissionService',
  TEAM_DASHBOARD_SERVICE: 'TeamDashboardService',
  SLUG_GENERATOR: 'SlugGenerator',
  INVITATION_SERVICE: 'InvitationService',
  PERMISSION_CHECKER: 'PermissionChecker',
  
  // Controllers
  ORGANIZATION_CONTROLLER: 'OrganizationController',
  MEMBER_CONTROLLER: 'MemberController',
  INVITATION_CONTROLLER: 'InvitationController',
  HEALTH_CONTROLLER: 'HealthController',
  TEAM_COLLABORATION_CONTROLLER: 'TeamCollaborationController',
  
  // Infrastructure
  DATABASE_CONNECTION: 'DatabaseConnection',
  LOGGER: 'Logger',
  HEALTH_CHECKER: 'HealthChecker',
} as const;