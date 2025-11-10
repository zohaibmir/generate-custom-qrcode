// Clean Architecture Interfaces for Team Service
// Following SOLID principles with proper abstraction layers

import { ServiceResponse as SharedServiceResponse, ServiceError, AppError, ValidationError, NotFoundError, ConflictError } from '@qr-saas/shared';

// Re-export for consistency with enhanced response
export interface ServiceResponse<T = any> extends SharedServiceResponse<T> {
  meta?: {
    total?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
export { ServiceError, AppError, ValidationError, NotFoundError, ConflictError };

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Basic interfaces
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Team Role enum
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

// Domain models
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings: Record<string, any>;
  subscriptionPlanId?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: TeamRole;
  permissions: Record<string, any>;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
}

// QR Library domain models
export interface QRLibrary {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  colorHex: string;
  icon: string;
  isPublic: boolean;
  isDefault: boolean;
  createdBy: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRLibraryItem {
  id: string;
  libraryId: string;
  qrCodeId: string;
  addedBy: string;
  position: number;
  notes?: string;
  tags: string[];
  isFeatured: boolean;
  createdAt: Date;
}

export interface QRLibraryPermission {
  id: string;
  libraryId: string;
  userId?: string;
  role?: TeamRole;
  permissions: Record<string, any>;
  grantedBy: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface QRAccessControl {
  id: string;
  qrCodeId: string;
  userId?: string;
  role?: TeamRole;
  permissions: Record<string, any>;
  grantedBy: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDashboardMetric {
  id: string;
  organizationId: string;
  metricType: string;
  metricName: string;
  metricValue: number;
  metricData: Record<string, any>;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface TeamActivity {
  id: string;
  organizationId: string;
  userId: string;
  activityType: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Request DTOs
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberRequest {
  email: string;
  role: TeamRole;
}

export interface UpdateMemberRoleRequest {
  role: TeamRole;
  permissions?: Record<string, any>;
}

export interface AcceptInvitationRequest {
  token: string;
}

// QR Library Request DTOs
export interface CreateLibraryRequest {
  name: string;
  description?: string;
  colorHex?: string;
  icon?: string;
  isPublic?: boolean;
  settings?: Record<string, any>;
}

export interface UpdateLibraryRequest {
  name?: string;
  description?: string;
  colorHex?: string;
  icon?: string;
  isPublic?: boolean;
  settings?: Record<string, any>;
}

export interface AddToLibraryRequest {
  qrCodeIds: string[];
  notes?: string;
  tags?: string[];
  isFeatured?: boolean;
}

export interface UpdateLibraryItemRequest {
  position?: number;
  notes?: string;
  tags?: string[];
  isFeatured?: boolean;
}

export interface GrantQRAccessRequest {
  userId?: string;
  role?: TeamRole;
  permissions: Record<string, any>;
  expiresAt?: Date;
}

export interface TeamDashboardRequest {
  periodDays?: number;
  metricTypes?: string[];
  includeActivity?: boolean;
}

// Response DTOs
export interface OrganizationWithStats extends Organization {
  memberCount: number;
  qrCodeCount: number;
  sharedQrCodeCount: number;
}

export interface MemberWithUserInfo extends OrganizationMember {
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatar?: string;
  };
}

export interface QRLibraryWithItems extends QRLibrary {
  items: QRLibraryItemWithQR[];
  itemCount: number;
  permissions: QRLibraryPermission[];
}

export interface QRLibraryItemWithQR extends QRLibraryItem {
  qrCode: {
    id: string;
    name: string;
    type: string;
    shortId: string;
    isActive: boolean;
    currentScans: number;
    createdAt: Date;
  };
}

export interface QRAccessLog {
  id: string;
  qrCodeId: string;
  userId: string;
  action: string;
  permissionUsed?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface TeamDashboardData {
  organizationStats: {
    totalQrCodes: number;
    totalLibraries: number;
    totalScans: number;
    scansThisPeriod: number;
    activeMembers: number;
    sharedQrCodes: number;
  };
  metrics: TeamDashboardMetric[];
  recentActivity: TeamActivity[];
  topPerformingQRs: Array<{
    id: string;
    name: string;
    scans: number;
    library?: string;
  }>;
  memberActivity: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: Date;
  }>;
}

// Permission definitions
export interface TeamPermissions {
  organization: {
    read: boolean;
    update: boolean;
    delete: boolean;
    invite_members: boolean;
    manage_roles: boolean;
    manage_billing: boolean;
  };
  qr_codes: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    bulk_operations: boolean;
    share_with_team: boolean;
  };
  analytics: {
    view_all: boolean;
    view_own: boolean;
    export: boolean;
  };
}

// Service interfaces (Business logic layer)
export interface ITeamService {
  // Organization management
  createOrganization(userId: string, data: CreateOrganizationRequest): Promise<ServiceResponse<Organization>>;
  getOrganization(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationWithStats>>;
  updateOrganization(organizationId: string, userId: string, updates: UpdateOrganizationRequest): Promise<ServiceResponse<Organization>>;
  deleteOrganization(organizationId: string, userId: string): Promise<ServiceResponse<void>>;
  getUserOrganizations(userId: string, pagination: PaginationOptions): Promise<ServiceResponse<Organization[]>>;
  
  // Member management
  inviteMember(organizationId: string, userId: string, invitation: InviteMemberRequest): Promise<ServiceResponse<OrganizationInvitation>>;
  getMembers(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<MemberWithUserInfo[]>>;
  updateMemberRole(organizationId: string, userId: string, memberId: string, updates: UpdateMemberRoleRequest): Promise<ServiceResponse<OrganizationMember>>;
  removeMember(organizationId: string, userId: string, memberId: string): Promise<ServiceResponse<void>>;
  
  // Invitation management
  acceptInvitation(userId: string, token: string): Promise<ServiceResponse<OrganizationMember>>;
  getPendingInvitations(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationInvitation[]>>;
  cancelInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>>;
  resendInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>>;
  
  // Permission checking
  checkPermission(userId: string, organizationId: string, permission: string): Promise<ServiceResponse<boolean>>;
  getUserRole(userId: string, organizationId: string): Promise<ServiceResponse<TeamRole | null>>;
  
  // QR Library management
  createLibrary(organizationId: string, userId: string, data: CreateLibraryRequest): Promise<ServiceResponse<QRLibrary>>;
  getLibraries(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRLibrary[]>>;
  getLibrary(libraryId: string, userId: string): Promise<ServiceResponse<QRLibraryWithItems>>;
  updateLibrary(libraryId: string, userId: string, updates: UpdateLibraryRequest): Promise<ServiceResponse<QRLibrary>>;
  deleteLibrary(libraryId: string, userId: string): Promise<ServiceResponse<void>>;
  
  // Library item management
  addToLibrary(libraryId: string, userId: string, data: AddToLibraryRequest): Promise<ServiceResponse<QRLibraryItem[]>>;
  removeFromLibrary(libraryId: string, userId: string, qrCodeId: string): Promise<ServiceResponse<void>>;
  updateLibraryItem(itemId: string, userId: string, updates: UpdateLibraryItemRequest): Promise<ServiceResponse<QRLibraryItem>>;
  getLibraryItems(libraryId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRLibraryItemWithQR[]>>;
  
  // Team dashboard
  getTeamDashboard(organizationId: string, userId: string, request: TeamDashboardRequest): Promise<ServiceResponse<TeamDashboardData>>;
  getTeamActivity(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<TeamActivity[]>>;
}

// Enhanced QR Service interface for fine-grained permissions
export interface IQRPermissionService {
  // QR Access Control
  grantQRAccess(qrCodeId: string, userId: string, data: GrantQRAccessRequest): Promise<ServiceResponse<QRAccessControl>>;
  revokeQRAccess(qrCodeId: string, userId: string, accessId: string): Promise<ServiceResponse<void>>;
  checkQRAccess(qrCodeId: string, userId: string, permission: string): Promise<ServiceResponse<boolean>>;
  getQRPermissions(qrCodeId: string, userId: string): Promise<ServiceResponse<QRAccessControl[]>>;
  updateQRPermissions(qrCodeId: string, userId: string, permissions: Record<string, any>): Promise<ServiceResponse<void>>;
  
  // Access logging
  logQRAccess(qrCodeId: string, userId: string, action: string, metadata?: Record<string, any>): Promise<void>;
  getQRAccessLog(qrCodeId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRAccessLog[]>>;
}

// Repository interfaces (Data access layer)
export interface IOrganizationRepository {
  create(data: CreateOrganizationRequest & { createdBy: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findByUserId(userId: string, pagination: PaginationOptions): Promise<{ organizations: Organization[]; total: number }>;
  update(id: string, updates: UpdateOrganizationRequest): Promise<Organization>;
  delete(id: string): Promise<void>;
  getStats(organizationId: string): Promise<{
    memberCount: number;
    qrCodeCount: number;
    sharedQrCodeCount: number;
  }>;
}

export interface IMemberRepository {
  create(data: {
    organizationId: string;
    userId: string;
    role: TeamRole;
    invitedBy?: string;
    status?: 'pending' | 'active';
  }): Promise<OrganizationMember>;
  findById(id: string): Promise<OrganizationMember | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null>;
  findByOrganization(organizationId: string, pagination: PaginationOptions): Promise<{ members: MemberWithUserInfo[]; total: number }>;
  updateRole(id: string, role: TeamRole, permissions?: Record<string, any>): Promise<OrganizationMember>;
  updateStatus(id: string, status: 'active' | 'suspended'): Promise<OrganizationMember>;
  delete(id: string): Promise<void>;
}

export interface IInvitationRepository {
  create(data: {
    organizationId: string;
    email: string;
    role: TeamRole;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<OrganizationInvitation>;
  findById(id: string): Promise<OrganizationInvitation | null>;
  findByToken(token: string): Promise<OrganizationInvitation | null>;
  findByOrganization(organizationId: string): Promise<OrganizationInvitation[]>;
  findByEmail(email: string): Promise<OrganizationInvitation[]>;
  accept(id: string, userId: string): Promise<OrganizationInvitation>;
  delete(id: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

// QR Library Repository interfaces
export interface IQRLibraryRepository {
  create(data: CreateLibraryRequest & { organizationId: string; createdBy: string }): Promise<QRLibrary>;
  findById(id: string): Promise<QRLibrary | null>;
  findByOrganization(organizationId: string, pagination: PaginationOptions): Promise<{ libraries: QRLibrary[]; total: number }>;
  findUserAccessibleLibraries(organizationId: string, userId: string, pagination: PaginationOptions): Promise<{ libraries: QRLibrary[]; total: number }>;
  update(id: string, updates: UpdateLibraryRequest): Promise<QRLibrary>;
  delete(id: string): Promise<void>;
  getStats(libraryId: string): Promise<{ itemCount: number; scanCount: number; memberCount: number }>;
}

export interface IQRLibraryItemRepository {
  create(data: {
    libraryId: string;
    qrCodeId: string;
    addedBy: string;
    position?: number;
    notes?: string;
    tags?: string[];
    isFeatured?: boolean;
  }): Promise<QRLibraryItem>;
  findById(id: string): Promise<QRLibraryItem | null>;
  findByLibrary(libraryId: string, pagination: PaginationOptions): Promise<{ items: QRLibraryItemWithQR[]; total: number }>;
  findByQRCode(qrCodeId: string): Promise<QRLibraryItem[]>;
  update(id: string, updates: UpdateLibraryItemRequest): Promise<QRLibraryItem>;
  delete(id: string): Promise<void>;
  bulkCreate(items: Array<{ libraryId: string; qrCodeId: string; addedBy: string; notes?: string; tags?: string[] }>): Promise<QRLibraryItem[]>;
  bulkDelete(libraryId: string, qrCodeIds: string[]): Promise<void>;
  reorderItems(libraryId: string, itemOrders: Array<{ id: string; position: number }>): Promise<void>;
}

export interface IQRLibraryPermissionRepository {
  create(data: {
    libraryId: string;
    userId?: string;
    role?: TeamRole;
    permissions: Record<string, any>;
    grantedBy: string;
    expiresAt?: Date;
  }): Promise<QRLibraryPermission>;
  findById(id: string): Promise<QRLibraryPermission | null>;
  findByLibrary(libraryId: string): Promise<QRLibraryPermission[]>;
  findByUser(userId: string): Promise<QRLibraryPermission[]>;
  checkUserAccess(libraryId: string, userId: string): Promise<QRLibraryPermission | null>;
  update(id: string, permissions: Record<string, any>): Promise<QRLibraryPermission>;
  delete(id: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

// QR Access Control Repository interfaces
export interface IQRAccessControlRepository {
  create(data: {
    qrCodeId: string;
    userId?: string;
    role?: TeamRole;
    permissions: Record<string, any>;
    grantedBy: string;
    expiresAt?: Date;
  }): Promise<QRAccessControl>;
  findById(id: string): Promise<QRAccessControl | null>;
  findByQRCode(qrCodeId: string, pagination: PaginationOptions): Promise<{ accessControls: QRAccessControl[]; total: number }>;
  findByUser(userId: string, pagination: PaginationOptions): Promise<{ accessControls: QRAccessControl[]; total: number }>;
  checkAccess(qrCodeId: string, userId?: string, role?: string): Promise<QRAccessControl | null>;
  update(id: string, updates: Partial<GrantQRAccessRequest>): Promise<QRAccessControl>;
  revoke(id: string): Promise<void>;
  bulkRevoke(qrCodeId: string, userIds?: string[], roles?: string[]): Promise<number>;
  cleanupExpired(): Promise<number>;
}

export interface IQRAccessLogRepository {
  create(data: {
    qrCodeId: string;
    userId: string;
    action: string;
    permissionUsed?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<QRAccessLog>;
  findByQRCode(qrCodeId: string, pagination: PaginationOptions): Promise<{ logs: QRAccessLog[]; total: number }>;
  findByUser(userId: string, pagination: PaginationOptions): Promise<{ logs: QRAccessLog[]; total: number }>;
  findByOrganization(organizationId: string, pagination: PaginationOptions): Promise<{ logs: QRAccessLog[]; total: number }>;
  getAccessStats(qrCodeId: string, periodDays: number): Promise<Record<string, any>>;
  cleanup(retentionDays: number): Promise<number>;
}

// Team Dashboard Repository interfaces
export interface ITeamDashboardRepository {
  getOrganizationStats(organizationId: string, periodDays: number): Promise<TeamDashboardData['organizationStats']>;
  getTeamMetrics(organizationId: string, metricTypes: string[], periodDays: number): Promise<TeamDashboardMetric[]>;
  getRecentActivity(organizationId: string, pagination: PaginationOptions): Promise<{ activities: TeamActivity[]; total: number }>;
  getTopPerformingQRs(organizationId: string, limit: number, periodDays: number): Promise<TeamDashboardData['topPerformingQRs']>;
  getMemberActivity(organizationId: string, periodDays: number): Promise<TeamDashboardData['memberActivity']>;
  createMetric(data: {
    organizationId: string;
    metricType: string;
    metricName: string;
    metricValue: number;
    metricData?: Record<string, any>;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<TeamDashboardMetric>;
  logActivity(data: {
    organizationId: string;
    userId: string;
    activityType: string;
    resourceType?: string;
    resourceId?: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<TeamActivity>;
  getMetricHistory(organizationId: string, metricType: string, periodDays: number): Promise<TeamDashboardMetric[]>;
  cleanupOldMetrics(retentionDays: number): Promise<number>;
  cleanupOldActivity(retentionDays: number): Promise<number>;
}

// Utility interfaces
export interface ISlugGenerator {
  generateSlug(name: string, existingCheck: (slug: string) => Promise<boolean>): Promise<string>;
}

export interface IInvitationService {
  generateInvitationToken(): string;
  sendInvitationEmail(invitation: OrganizationInvitation, organization: Organization): Promise<void>;
}

export interface IPermissionChecker {
  checkPermission(role: TeamRole, permission: string): boolean;
  getPermissions(role: TeamRole): TeamPermissions;
  canPerformAction(userRole: TeamRole, targetRole: TeamRole, action: string): boolean;
}

// Infrastructure interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    timestamp: string;
    dependencies: Record<string, any>;
  }>;
}

// Error classes specific to team service
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized to perform this action') {
    super(message, 403, 'UNAUTHORIZED', true);
  }
}

export class InvitationExpiredError extends AppError {
  constructor() {
    super('Invitation has expired', 400, 'INVITATION_EXPIRED', true);
  }
}

export class InvitationAlreadyAcceptedError extends AppError {
  constructor() {
    super('Invitation has already been accepted', 400, 'INVITATION_ALREADY_ACCEPTED', true);
  }
}

export class SlugAlreadyExistsError extends ConflictError {
  constructor(slug: string) {
    super(`Organization slug '${slug}' already exists`);
  }
}

// Type guards
export const isOrganization = (obj: any): obj is Organization => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.slug === 'string';
};

export const isTeamRole = (role: string): role is TeamRole => {
  return ['owner', 'admin', 'editor', 'viewer'].includes(role);
};

export const isServiceResponse = <T>(obj: any): obj is ServiceResponse<T> => {
  return obj && typeof obj.success === 'boolean';
};