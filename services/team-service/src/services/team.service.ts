import {
  ITeamService,
  IOrganizationRepository,
  IMemberRepository,
  IInvitationRepository,
  Organization,
  OrganizationWithStats,
  OrganizationMember,
  MemberWithUserInfo,
  OrganizationInvitation,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  PaginationOptions,
  TeamRole,
  ServiceResponse,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  SlugAlreadyExistsError,
  ILogger,
  ISlugGenerator,
  IInvitationService,
  IPermissionChecker,
  QRLibrary,
  QRLibraryWithItems,
  QRLibraryItem,
  QRLibraryItemWithQR,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  AddToLibraryRequest,
  UpdateLibraryItemRequest,
  TeamDashboardRequest,
  TeamDashboardData,
  TeamActivity
} from '../interfaces';
import { QRLibraryService } from './qr-library.service';
import { businessConfig } from '../config';

export class TeamService implements ITeamService {
  private organizationRepo: IOrganizationRepository;
  private memberRepo: IMemberRepository;
  private invitationRepo: IInvitationRepository;
  private logger: ILogger;
  private slugGenerator: ISlugGenerator;
  private invitationService: IInvitationService;
  private permissionChecker: IPermissionChecker;
  private qrLibraryService: QRLibraryService;

  constructor(
    organizationRepo: IOrganizationRepository,
    memberRepo: IMemberRepository,
    invitationRepo: IInvitationRepository,
    logger: ILogger,
    slugGenerator: ISlugGenerator,
    invitationService: IInvitationService,
    permissionChecker: IPermissionChecker,
    qrLibraryService: QRLibraryService
  ) {
    this.organizationRepo = organizationRepo;
    this.memberRepo = memberRepo;
    this.invitationRepo = invitationRepo;
    this.logger = logger;
    this.slugGenerator = slugGenerator;
    this.invitationService = invitationService;
    this.permissionChecker = permissionChecker;
    this.qrLibraryService = qrLibraryService;
  }

  // Organization Management
  async createOrganization(userId: string, data: CreateOrganizationRequest): Promise<ServiceResponse<Organization>> {
    try {
      this.validateCreateOrganizationRequest(data);

      // Check if user has reached organization limit
      const userOrgs = await this.organizationRepo.findByUserId(userId, { page: 1, limit: 1 });
      if (userOrgs.total >= businessConfig.maxOrganizationsPerUser) {
        return {
          success: false,
          error: new ValidationError(`Maximum of ${businessConfig.maxOrganizationsPerUser} organizations allowed per user`)
        };
      }

      // Generate unique slug
      const slug = await this.slugGenerator.generateSlug(data.slug, async (slug) => {
        const existing = await this.organizationRepo.findBySlug(slug);
        return existing !== null;
      });

      // Create organization
      const organizationData = { ...data, slug, createdBy: userId };
      const organization = await this.organizationRepo.create(organizationData);

      // Add creator as owner
      await this.memberRepo.create({
        organizationId: organization.id,
        userId,
        role: 'owner',
        status: 'active'
      });

      this.logger.info('Organization created successfully', {
        organizationId: organization.id,
        userId,
        name: organization.name
      });

      return { success: true, data: organization };
    } catch (error: any) {
      this.logger.error('Failed to create organization', { userId, data, error });
      
      if (error instanceof SlugAlreadyExistsError || error instanceof ValidationError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to create organization', 500, 'INTERNAL_ERROR') };
    }
  }

  async getOrganization(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationWithStats>> {
    try {
      // Check if user is a member
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        return { success: false, error: new UnauthorizedError('Access denied to this organization') };
      }

      const organization = await this.organizationRepo.findById(organizationId);
      if (!organization) {
        return { success: false, error: new NotFoundError('Organization not found') };
      }

      const stats = await this.organizationRepo.getStats(organizationId);
      const organizationWithStats: OrganizationWithStats = { ...organization, ...stats };

      return { success: true, data: organizationWithStats };
    } catch (error: any) {
      this.logger.error('Failed to get organization', { organizationId, userId, error });
      return { success: false, error: new AppError('Failed to retrieve organization', 500, 'INTERNAL_ERROR') };
    }
  }

  async updateOrganization(organizationId: string, userId: string, updates: UpdateOrganizationRequest): Promise<ServiceResponse<Organization>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.update');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to update organization') };
      }

      const organization = await this.organizationRepo.update(organizationId, updates);
      
      this.logger.info('Organization updated successfully', {
        organizationId,
        userId,
        updates
      });

      return { success: true, data: organization };
    } catch (error: any) {
      this.logger.error('Failed to update organization', { organizationId, userId, updates, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to update organization', 500, 'INTERNAL_ERROR') };
    }
  }

  async deleteOrganization(organizationId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      // Check if user is owner
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.role !== 'owner') {
        return { success: false, error: new UnauthorizedError('Only organization owners can delete organizations') };
      }

      await this.organizationRepo.delete(organizationId);
      
      this.logger.info('Organization deleted successfully', {
        organizationId,
        userId
      });

      return { success: true, data: undefined };
    } catch (error: any) {
      this.logger.error('Failed to delete organization', { organizationId, userId, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to delete organization', 500, 'INTERNAL_ERROR') };
    }
  }

  async getUserOrganizations(userId: string, pagination: PaginationOptions): Promise<ServiceResponse<Organization[]>> {
    try {
      const result = await this.organizationRepo.findByUserId(userId, pagination);
      return { success: true, data: result.organizations, meta: { total: result.total } };
    } catch (error: any) {
      this.logger.error('Failed to get user organizations', { userId, pagination, error });
      return { success: false, error: new AppError('Failed to retrieve organizations', 500, 'INTERNAL_ERROR') };
    }
  }

  // Member Management
  async inviteMember(organizationId: string, userId: string, invitation: InviteMemberRequest): Promise<ServiceResponse<OrganizationInvitation>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.invite_members');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to invite members') };
      }

      // Validate invitation data
      this.validateInviteMemberRequest(invitation);

      // Check member limit
      const stats = await this.organizationRepo.getStats(organizationId);
      if (stats.memberCount >= businessConfig.maxMembersPerOrganization) {
        return {
          success: false,
          error: new ValidationError(`Maximum of ${businessConfig.maxMembersPerOrganization} members allowed per organization`)
        };
      }

      // Check if user is already a member or has pending invitation
      const existingInvitations = await this.invitationRepo.findByEmail(invitation.email);
      const orgInvitation = existingInvitations.find(inv => inv.organizationId === organizationId);
      if (orgInvitation) {
        return { success: false, error: new ConflictError('User already has a pending invitation') };
      }

      // Create invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + businessConfig.invitationExpiryDays);

      const newInvitation = await this.invitationRepo.create({
        organizationId,
        email: invitation.email,
        role: invitation.role,
        invitedBy: userId,
        expiresAt
      });

      // Send invitation email
      const organization = await this.organizationRepo.findById(organizationId);
      if (organization) {
        await this.invitationService.sendInvitationEmail(newInvitation, organization);
      }

      this.logger.info('Member invitation sent successfully', {
        organizationId,
        invitedBy: userId,
        email: invitation.email,
        role: invitation.role
      });

      return { success: true, data: newInvitation };
    } catch (error: any) {
      this.logger.error('Failed to invite member', { organizationId, userId, invitation, error });
      
      if (error instanceof UnauthorizedError || error instanceof ValidationError || error instanceof ConflictError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to send invitation', 500, 'INTERNAL_ERROR') };
    }
  }

  async getMembers(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<MemberWithUserInfo[]>> {
    try {
      // Check if user is a member
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        return { success: false, error: new UnauthorizedError('Access denied to this organization') };
      }

      const result = await this.memberRepo.findByOrganization(organizationId, pagination);
      return { success: true, data: result.members, meta: { total: result.total } };
    } catch (error: any) {
      this.logger.error('Failed to get members', { organizationId, userId, pagination, error });
      return { success: false, error: new AppError('Failed to retrieve members', 500, 'INTERNAL_ERROR') };
    }
  }

  async updateMemberRole(organizationId: string, userId: string, memberId: string, updates: UpdateMemberRoleRequest): Promise<ServiceResponse<OrganizationMember>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.manage_roles');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to manage roles') };
      }

      // Get current user role and target member
      const currentUserMember = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      const targetMember = await this.memberRepo.findById(memberId);

      if (!currentUserMember || !targetMember) {
        return { success: false, error: new NotFoundError('Member not found') };
      }

      // Check if user can modify this role
      if (!this.permissionChecker.canPerformAction(currentUserMember.role, targetMember.role, 'update_role')) {
        return { success: false, error: new UnauthorizedError('Cannot modify this member\'s role') };
      }

      const updatedMember = await this.memberRepo.updateRole(memberId, updates.role, updates.permissions);
      
      this.logger.info('Member role updated successfully', {
        organizationId,
        updatedBy: userId,
        memberId,
        newRole: updates.role
      });

      return { success: true, data: updatedMember };
    } catch (error: any) {
      this.logger.error('Failed to update member role', { organizationId, userId, memberId, updates, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to update member role', 500, 'INTERNAL_ERROR') };
    }
  }

  async removeMember(organizationId: string, userId: string, memberId: string): Promise<ServiceResponse<void>> {
    try {
      // Get current user role and target member
      const currentUserMember = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      const targetMember = await this.memberRepo.findById(memberId);

      if (!currentUserMember || !targetMember) {
        return { success: false, error: new NotFoundError('Member not found') };
      }

      // Check if user can remove this member
      const canRemove = currentUserMember.id === memberId || // Self removal
        this.permissionChecker.canPerformAction(currentUserMember.role, targetMember.role, 'remove');

      if (!canRemove) {
        return { success: false, error: new UnauthorizedError('Cannot remove this member') };
      }

      // Prevent removing the last owner
      if (targetMember.role === 'owner') {
        const allMembers = await this.memberRepo.findByOrganization(organizationId, { page: 1, limit: 100 });
        const ownerCount = allMembers.members.filter(m => m.role === 'owner').length;
        if (ownerCount <= 1) {
          return { success: false, error: new ValidationError('Cannot remove the last owner') };
        }
      }

      await this.memberRepo.delete(memberId);
      
      this.logger.info('Member removed successfully', {
        organizationId,
        removedBy: userId,
        memberId
      });

      return { success: true, data: undefined };
    } catch (error: any) {
      this.logger.error('Failed to remove member', { organizationId, userId, memberId, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof ValidationError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to remove member', 500, 'INTERNAL_ERROR') };
    }
  }

  // Invitation Management
  async acceptInvitation(userId: string, token: string): Promise<ServiceResponse<OrganizationMember>> {
    try {
      // Find invitation by token
      const invitation = await this.invitationRepo.findByToken(token);
      if (!invitation) {
        return { success: false, error: new InvitationExpiredError() };
      }

      // Check if user is already a member
      const existingMember = await this.memberRepo.findByUserAndOrganization(userId, invitation.organizationId);
      if (existingMember) {
        return { success: false, error: new ConflictError('User is already a member of this organization') };
      }

      // Accept invitation
      await this.invitationRepo.accept(invitation.id, userId);

      // Create member record
      const member = await this.memberRepo.create({
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        status: 'active'
      });

      this.logger.info('Invitation accepted successfully', {
        organizationId: invitation.organizationId,
        userId,
        invitationId: invitation.id
      });

      return { success: true, data: member };
    } catch (error: any) {
      this.logger.error('Failed to accept invitation', { userId, error });
      
      if (error instanceof InvitationExpiredError || error instanceof ConflictError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to accept invitation', 500, 'INTERNAL_ERROR') };
    }
  }

  async getPendingInvitations(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationInvitation[]>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.invite_members');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to view invitations') };
      }

      const invitations = await this.invitationRepo.findByOrganization(organizationId);
      return { success: true, data: invitations };
    } catch (error: any) {
      this.logger.error('Failed to get pending invitations', { organizationId, userId, error });
      return { success: false, error: new AppError('Failed to retrieve invitations', 500, 'INTERNAL_ERROR') };
    }
  }

  async cancelInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.invite_members');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to cancel invitations') };
      }

      await this.invitationRepo.delete(invitationId);
      
      this.logger.info('Invitation cancelled successfully', {
        organizationId,
        cancelledBy: userId,
        invitationId
      });

      return { success: true, data: undefined };
    } catch (error: any) {
      this.logger.error('Failed to cancel invitation', { organizationId, userId, invitationId, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to cancel invitation', 500, 'INTERNAL_ERROR') };
    }
  }

  async resendInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>> {
    try {
      // Check permissions
      const hasPermission = await this.checkUserPermission(userId, organizationId, 'organization.invite_members');
      if (!hasPermission) {
        return { success: false, error: new UnauthorizedError('Insufficient permissions to resend invitations') };
      }

      const invitation = await this.invitationRepo.findById(invitationId);
      if (!invitation) {
        return { success: false, error: new NotFoundError('Invitation not found') };
      }

      const organization = await this.organizationRepo.findById(organizationId);
      if (organization) {
        await this.invitationService.sendInvitationEmail(invitation, organization);
      }

      this.logger.info('Invitation resent successfully', {
        organizationId,
        resentBy: userId,
        invitationId
      });

      return { success: true, data: undefined };
    } catch (error: any) {
      this.logger.error('Failed to resend invitation', { organizationId, userId, invitationId, error });
      
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        return { success: false, error };
      }
      
      return { success: false, error: new AppError('Failed to resend invitation', 500, 'INTERNAL_ERROR') };
    }
  }

  // Permission Management
  async checkPermission(userId: string, organizationId: string, permission: string): Promise<ServiceResponse<boolean>> {
    try {
      const hasPermission = await this.checkUserPermission(userId, organizationId, permission);
      return { success: true, data: hasPermission };
    } catch (error: any) {
      this.logger.error('Failed to check permission', { userId, organizationId, permission, error });
      return { success: false, error: new AppError('Failed to check permission', 500, 'INTERNAL_ERROR') };
    }
  }

  async getUserRole(userId: string, organizationId: string): Promise<ServiceResponse<TeamRole | null>> {
    try {
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      return { success: true, data: member?.role || null };
    } catch (error: any) {
      this.logger.error('Failed to get user role', { userId, organizationId, error });
      return { success: false, error: new AppError('Failed to get user role', 500, 'INTERNAL_ERROR') };
    }
  }

  // Private helper methods
  private async checkUserPermission(userId: string, organizationId: string, permission: string): Promise<boolean> {
    const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
    if (!member || member.status !== 'active') {
      return false;
    }

    return this.permissionChecker.checkPermission(member.role, permission);
  }

  private validateCreateOrganizationRequest(data: CreateOrganizationRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Organization name is required');
    }

    if (data.name.length > 100) {
      throw new ValidationError('Organization name must be 100 characters or less');
    }

    if (!data.slug || data.slug.trim().length === 0) {
      throw new ValidationError('Organization slug is required');
    }

    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw new ValidationError('Organization slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (data.slug.length < 3 || data.slug.length > 50) {
      throw new ValidationError('Organization slug must be between 3 and 50 characters');
    }
  }

  private validateInviteMemberRequest(data: InviteMemberRequest): void {
    if (!data.email || data.email.trim().length === 0) {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!data.role || !['admin', 'editor', 'viewer'].includes(data.role)) {
      throw new ValidationError('Invalid role specified');
    }
  }

  // QR Library Management - Delegation to QRLibraryService
  async createLibrary(organizationId: string, userId: string, data: CreateLibraryRequest): Promise<ServiceResponse<QRLibrary>> {
    return this.qrLibraryService.createLibrary(organizationId, userId, data);
  }

  async getLibraries(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRLibrary[]>> {
    return this.qrLibraryService.getLibraries(organizationId, userId, pagination);
  }

  async getLibrary(libraryId: string, userId: string): Promise<ServiceResponse<QRLibraryWithItems>> {
    return this.qrLibraryService.getLibrary(libraryId, userId);
  }

  async updateLibrary(libraryId: string, userId: string, updates: UpdateLibraryRequest): Promise<ServiceResponse<QRLibrary>> {
    return this.qrLibraryService.updateLibrary(libraryId, userId, updates);
  }

  async deleteLibrary(libraryId: string, userId: string): Promise<ServiceResponse<void>> {
    return this.qrLibraryService.deleteLibrary(libraryId, userId);
  }

  async addToLibrary(libraryId: string, userId: string, data: AddToLibraryRequest): Promise<ServiceResponse<QRLibraryItem[]>> {
    return this.qrLibraryService.addToLibrary(libraryId, userId, data);
  }

  async removeFromLibrary(libraryId: string, userId: string, qrCodeId: string): Promise<ServiceResponse<void>> {
    return this.qrLibraryService.removeFromLibrary(libraryId, userId, qrCodeId);
  }

  async updateLibraryItem(itemId: string, userId: string, updates: UpdateLibraryItemRequest): Promise<ServiceResponse<QRLibraryItem>> {
    return this.qrLibraryService.updateLibraryItem(itemId, userId, updates);
  }

  async getLibraryItems(libraryId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<QRLibraryItemWithQR[]>> {
    return this.qrLibraryService.getLibraryItems(libraryId, userId, pagination);
  }

  // Team Dashboard Management - TODO: Implement TeamDashboardService
  async getTeamDashboard(organizationId: string, userId: string, request: TeamDashboardRequest): Promise<ServiceResponse<TeamDashboardData>> {
    try {
      // Check if user is a member
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        return { success: false, error: new UnauthorizedError('Access denied to this organization') };
      }

      // TODO: Implement proper dashboard data aggregation
      // For now, return placeholder data
      const dashboardData: TeamDashboardData = {
        organizationStats: {
          totalQrCodes: 0,
          totalLibraries: 0,
          totalScans: 0,
          scansThisPeriod: 0,
          activeMembers: 0,
          sharedQrCodes: 0
        },
        metrics: [],
        recentActivity: [],
        topPerformingQRs: [],
        memberActivity: []
      };

      return { success: true, data: dashboardData };
    } catch (error: any) {
      this.logger.error('Failed to get team dashboard', { organizationId, userId, error });
      return { success: false, error: new AppError('Failed to retrieve team dashboard', 500, 'INTERNAL_ERROR') };
    }
  }

  async getTeamActivity(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<TeamActivity[]>> {
    try {
      // Check if user is a member
      const member = await this.memberRepo.findByUserAndOrganization(userId, organizationId);
      if (!member || member.status !== 'active') {
        return { success: false, error: new UnauthorizedError('Access denied to this organization') };
      }

      // TODO: Implement activity repository and return actual activity
      // For now, return empty array
      const activities: TeamActivity[] = [];

      return { success: true, data: activities, meta: { total: 0 } };
    } catch (error: any) {
      this.logger.error('Failed to get team activity', { organizationId, userId, error });
      return { success: false, error: new AppError('Failed to retrieve team activity', 500, 'INTERNAL_ERROR') };
    }
  }
}