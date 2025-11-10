import {
  IQRLibraryRepository,
  IQRLibraryItemRepository,
  IQRLibraryPermissionRepository,
  IPermissionChecker,
  ILogger,
  QRLibrary,
  QRLibraryWithItems,
  QRLibraryItem,
  QRLibraryItemWithQR,
  CreateLibraryRequest,
  UpdateLibraryRequest,
  AddToLibraryRequest,
  UpdateLibraryItemRequest,
  PaginationOptions,
  ServiceResponse,
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError
} from '../interfaces';

export class QRLibraryService {
  constructor(
    private libraryRepository: IQRLibraryRepository,
    private itemRepository: IQRLibraryItemRepository,
    private permissionRepository: IQRLibraryPermissionRepository,
    private permissionChecker: IPermissionChecker,
    private logger: ILogger
  ) {}

  async createLibrary(
    organizationId: string, 
    userId: string, 
    data: CreateLibraryRequest
  ): Promise<ServiceResponse<QRLibrary>> {
    try {
      // Validate input
      if (!data.name?.trim()) {
        throw new ValidationError('Library name is required');
      }

      if (data.name.trim().length > 255) {
        throw new ValidationError('Library name cannot exceed 255 characters');
      }

      // Check if user has permission to create libraries
      const canCreate = await this.checkLibraryPermission(userId, organizationId, 'create');
      if (!canCreate) {
        throw new UnauthorizedError('You do not have permission to create libraries');
      }

      // Create library
      const library = await this.libraryRepository.create({
        ...data,
        organizationId,
        createdBy: userId,
        name: data.name.trim()
      });

      this.logger.info('Library created successfully', {
        libraryId: library.id,
        organizationId,
        userId,
        name: library.name
      });

      return { 
        success: true, 
        data: library
      };

    } catch (error) {
      this.logger.error('Failed to create library', {
        organizationId,
        userId,
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to create library', 500, 'INTERNAL_ERROR');
    }
  }

  async getLibraries(
    organizationId: string, 
    userId: string, 
    pagination: PaginationOptions
  ): Promise<ServiceResponse<QRLibrary[]>> {
    try {
      // Check if user has access to organization
      const canRead = await this.checkLibraryPermission(userId, organizationId, 'read');
      if (!canRead) {
        throw new UnauthorizedError('You do not have permission to view libraries');
      }

      // Get user-accessible libraries
      const { libraries, total } = await this.libraryRepository.findUserAccessibleLibraries(
        organizationId, 
        userId, 
        pagination
      );

      this.logger.debug('Retrieved libraries', {
        organizationId,
        userId,
        count: libraries.length,
        total
      });

      return { 
        success: true, 
        data: libraries,
        meta: {
          total,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit)
          }
        }
      };

    } catch (error) {
      this.logger.error('Failed to get libraries', {
        organizationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to get libraries', 500, 'INTERNAL_ERROR');
    }
  }

  async getLibrary(
    libraryId: string, 
    userId: string
  ): Promise<ServiceResponse<QRLibraryWithItems>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canRead = await this.checkLibraryAccess(userId, library, 'read');
      if (!canRead) {
        throw new UnauthorizedError('You do not have permission to view this library');
      }

      // Get library items with QR details
      const { items, total: itemCount } = await this.itemRepository.findByLibrary(
        libraryId, 
        { page: 1, limit: 1000, sortBy: 'position', sortOrder: 'asc' }
      );

      // Get library permissions
      const permissions = await this.permissionRepository.findByLibrary(libraryId);

      const libraryWithItems: QRLibraryWithItems = {
        ...library,
        items,
        itemCount,
        permissions
      };

      this.logger.debug('Retrieved library details', {
        libraryId,
        userId,
        itemCount,
        permissionCount: permissions.length
      });

      return { 
        success: true, 
        data: libraryWithItems
      };

    } catch (error) {
      this.logger.error('Failed to get library', {
        libraryId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to get library', 500, 'INTERNAL_ERROR');
    }
  }

  async updateLibrary(
    libraryId: string, 
    userId: string, 
    updates: UpdateLibraryRequest
  ): Promise<ServiceResponse<QRLibrary>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canUpdate = await this.checkLibraryAccess(userId, library, 'update');
      if (!canUpdate) {
        throw new UnauthorizedError('You do not have permission to update this library');
      }

      // Validate updates
      if (updates.name !== undefined) {
        if (!updates.name?.trim()) {
          throw new ValidationError('Library name cannot be empty');
        }
        if (updates.name.trim().length > 255) {
          throw new ValidationError('Library name cannot exceed 255 characters');
        }
        updates.name = updates.name.trim();
      }

      // Update library
      const updatedLibrary = await this.libraryRepository.update(libraryId, updates);

      this.logger.info('Library updated successfully', {
        libraryId,
        userId,
        updates: Object.keys(updates)
      });

      return { 
        success: true, 
        data: updatedLibrary
      };

    } catch (error) {
      this.logger.error('Failed to update library', {
        libraryId,
        userId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to update library', 500, 'INTERNAL_ERROR');
    }
  }

  async deleteLibrary(
    libraryId: string, 
    userId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canDelete = await this.checkLibraryAccess(userId, library, 'delete');
      if (!canDelete) {
        throw new UnauthorizedError('You do not have permission to delete this library');
      }

      // Prevent deletion of default library
      if (library.isDefault) {
        throw new ValidationError('Cannot delete default library');
      }

      // Delete library
      await this.libraryRepository.delete(libraryId);

      this.logger.info('Library deleted successfully', {
        libraryId,
        userId,
        libraryName: library.name
      });

      return { 
        success: true, 
        data: undefined
      };

    } catch (error) {
      this.logger.error('Failed to delete library', {
        libraryId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to delete library', 500, 'INTERNAL_ERROR');
    }
  }

  async addToLibrary(
    libraryId: string, 
    userId: string, 
    data: AddToLibraryRequest
  ): Promise<ServiceResponse<QRLibraryItem[]>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canAdd = await this.checkLibraryAccess(userId, library, 'add_items');
      if (!canAdd) {
        throw new UnauthorizedError('You do not have permission to add items to this library');
      }

      // Validate QR code IDs
      if (!data.qrCodeIds || data.qrCodeIds.length === 0) {
        throw new ValidationError('At least one QR code ID is required');
      }

      if (data.qrCodeIds.length > 50) {
        throw new ValidationError('Cannot add more than 50 QR codes at once');
      }

      // TODO: Validate that QR codes exist and belong to organization
      // This would require access to QR service or shared repository

      // Prepare bulk create data
      const itemsToCreate = data.qrCodeIds.map(qrCodeId => ({
        libraryId,
        qrCodeId,
        addedBy: userId,
        ...(data.notes && { notes: data.notes }),
        tags: data.tags || []
      }));

      // Bulk create items
      const createdItems = await this.itemRepository.bulkCreate(itemsToCreate);

      this.logger.info('QR codes added to library', {
        libraryId,
        userId,
        requestedCount: data.qrCodeIds.length,
        addedCount: createdItems.length
      });

      return { 
        success: true, 
        data: createdItems
      };

    } catch (error) {
      this.logger.error('Failed to add QR codes to library', {
        libraryId,
        userId,
        qrCodeCount: data.qrCodeIds?.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }

      throw new AppError('Failed to add QR codes to library', 500, 'INTERNAL_ERROR');
    }
  }

  async removeFromLibrary(
    libraryId: string, 
    userId: string, 
    qrCodeId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canRemove = await this.checkLibraryAccess(userId, library, 'remove_items');
      if (!canRemove) {
        throw new UnauthorizedError('You do not have permission to remove items from this library');
      }

      // Find item
      const items = await this.itemRepository.findByLibrary(libraryId, { page: 1, limit: 1000 });
      const item = items.items.find(i => i.qrCodeId === qrCodeId);

      if (!item) {
        throw new NotFoundError('QR code not found in library');
      }

      // Remove item
      await this.itemRepository.delete(item.id);

      this.logger.info('QR code removed from library', {
        libraryId,
        userId,
        qrCodeId,
        itemId: item.id
      });

      return { 
        success: true, 
        data: undefined
      };

    } catch (error) {
      this.logger.error('Failed to remove QR code from library', {
        libraryId,
        userId,
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to remove QR code from library', 500, 'INTERNAL_ERROR');
    }
  }

  async updateLibraryItem(
    itemId: string, 
    userId: string, 
    updates: UpdateLibraryItemRequest
  ): Promise<ServiceResponse<QRLibraryItem>> {
    try {
      // Get item
      const item = await this.itemRepository.findById(itemId);
      if (!item) {
        throw new NotFoundError('Library item not found');
      }

      // Get library to check permissions
      const library = await this.libraryRepository.findById(item.libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canUpdate = await this.checkLibraryAccess(userId, library, 'update_items');
      if (!canUpdate) {
        throw new UnauthorizedError('You do not have permission to update library items');
      }

      // Update item
      const updatedItem = await this.itemRepository.update(itemId, updates);

      this.logger.info('Library item updated', {
        itemId,
        libraryId: item.libraryId,
        userId,
        updates: Object.keys(updates)
      });

      return { 
        success: true, 
        data: updatedItem
      };

    } catch (error) {
      this.logger.error('Failed to update library item', {
        itemId,
        userId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to update library item', 500, 'INTERNAL_ERROR');
    }
  }

  async getLibraryItems(
    libraryId: string, 
    userId: string, 
    pagination: PaginationOptions
  ): Promise<ServiceResponse<QRLibraryItemWithQR[]>> {
    try {
      // Get library
      const library = await this.libraryRepository.findById(libraryId);
      if (!library) {
        throw new NotFoundError('Library not found');
      }

      // Check permission
      const canRead = await this.checkLibraryAccess(userId, library, 'read');
      if (!canRead) {
        throw new UnauthorizedError('You do not have permission to view this library');
      }

      // Get items
      const { items, total } = await this.itemRepository.findByLibrary(libraryId, pagination);

      this.logger.debug('Retrieved library items', {
        libraryId,
        userId,
        count: items.length,
        total
      });

      return { 
        success: true, 
        data: items,
        meta: {
          total,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit)
          }
        }
      };

    } catch (error) {
      this.logger.error('Failed to get library items', {
        libraryId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }

      throw new AppError('Failed to get library items', 500, 'INTERNAL_ERROR');
    }
  }

  private async checkLibraryPermission(userId: string, organizationId: string, action: string): Promise<boolean> {
    try {
      // TODO: Implement organization membership check
      // This would require access to team service methods
      return true; // Placeholder - implement proper permission checking
    } catch (error) {
      this.logger.error('Failed to check library permission', {
        userId,
        organizationId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async checkLibraryAccess(userId: string, library: QRLibrary, action: string): Promise<boolean> {
    try {
      // Library owner always has full access
      if (library.createdBy === userId) {
        return true;
      }

      // Check if library is public and action is read
      if (library.isPublic && action === 'read') {
        return true;
      }

      // Check specific library permissions
      const userPermission = await this.permissionRepository.checkUserAccess(library.id, userId);
      if (userPermission && userPermission.permissions[action]) {
        return true;
      }

      // TODO: Check organization-level permissions
      // This would require access to team service for role checking

      return false;
    } catch (error) {
      this.logger.error('Failed to check library access', {
        userId,
        libraryId: library.id,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}