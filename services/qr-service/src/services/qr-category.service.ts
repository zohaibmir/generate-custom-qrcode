import { 
  IQRCategoryService,
  IQRCategoryRepository,
  QRCategory,
  CreateCategoryRequest,
  CategoryQueryOptions,
  QRCategoryTree,
  QRCategoryTreeNode,
  CategoryStats,
  ServiceResponse,
  ILogger,
  ValidationError,
  NotFoundError,
  DatabaseError
} from '../interfaces';

/**
 * QR Category Service - Business Logic Layer
 * 
 * Handles all QR category operations with business rules
 * Follows clean architecture and SOLID principles
 */
export class QRCategoryService implements IQRCategoryService {
  constructor(
    private readonly categoryRepository: IQRCategoryRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Create a new QR category
   */
  async createCategory(userId: string, categoryData: CreateCategoryRequest): Promise<ServiceResponse<QRCategory>> {
    try {
      this.logger.info('Creating QR category', { userId, categoryName: categoryData.name });

      // Validate category data
      const validationResult = this.validateCategoryData(categoryData);
      if (!validationResult.isValid) {
        throw new ValidationError(validationResult.message, validationResult.errors);
      }

      // Check if parent category exists (if specified)
      if (categoryData.parentId) {
        const parentCategory = await this.categoryRepository.findById(categoryData.parentId);
        if (!parentCategory) {
          throw new ValidationError('Parent category not found');
        }
        
        if (parentCategory.userId !== userId) {
          throw new ValidationError('Parent category does not belong to user');
        }
      }

      // Create category
      const category = await this.categoryRepository.create({
        userId,
        ...categoryData
      });

      this.logger.info('Category created successfully', { 
        categoryId: category.id, 
        name: category.name,
        userId 
      });

      return {
        success: true,
        data: category,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to create category', { error, userId, categoryData });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400,
            details: error.details
          }
        };
      }

      if (error instanceof DatabaseError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
            statusCode: 500
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CATEGORY_CREATION_FAILED',
          message: 'Failed to create category',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<ServiceResponse<QRCategory>> {
    try {
      this.logger.info('Fetching category by ID', { categoryId: id });

      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundError('Category');
      }

      return {
        success: true,
        data: category,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch category by ID', { error, categoryId: id });

      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: error.message,
            statusCode: 404
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CATEGORY_FETCH_FAILED',
          message: 'Failed to fetch category',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get user categories
   */
  async getUserCategories(userId: string, options: CategoryQueryOptions = {}): Promise<ServiceResponse<QRCategory[]>> {
    try {
      this.logger.info('Fetching user categories', { userId, options });

      const categories = await this.categoryRepository.findByUserId(userId, options);

      return {
        success: true,
        data: categories,
        metadata: {
          timestamp: new Date().toISOString(),
          total: categories.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch user categories', { error, userId, options });

      return {
        success: false,
        error: {
          code: 'CATEGORIES_FETCH_FAILED',
          message: 'Failed to fetch categories',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: string, categoryData: Partial<CreateCategoryRequest>): Promise<ServiceResponse<QRCategory>> {
    try {
      this.logger.info('Updating category', { categoryId: id, categoryData });

      // Validate category data
      if (categoryData.name || categoryData.parentId || categoryData.color) {
        const validationResult = this.validateCategoryData(categoryData as CreateCategoryRequest, false);
        if (!validationResult.isValid) {
          throw new ValidationError(validationResult.message, validationResult.errors);
        }
      }

      // Check if category exists
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundError('Category');
      }

      // Prevent moving category to its own child
      if (categoryData.parentId) {
        const isValidMove = await this.validateCategoryMove(id, categoryData.parentId);
        if (!isValidMove) {
          throw new ValidationError('Cannot move category to its own child');
        }
      }

      const updatedCategory = await this.categoryRepository.update(id, categoryData);

      this.logger.info('Category updated successfully', { 
        categoryId: id, 
        name: updatedCategory.name 
      });

      return {
        success: true,
        data: updatedCategory,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to update category', { error, categoryId: id, categoryData });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400,
            details: error.details
          }
        };
      }

      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: error.message,
            statusCode: 404
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CATEGORY_UPDATE_FAILED',
          message: 'Failed to update category',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string, transferToCategory?: string): Promise<ServiceResponse<boolean>> {
    try {
      this.logger.info('Deleting category', { categoryId: id, transferToCategory });

      // Check if category exists
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundError('Category');
      }

      // Prevent deletion of default categories (optional business rule)
      if (category.isDefault) {
        throw new ValidationError('Cannot delete default category');
      }

      // If transfer category is specified, move QRs first
      if (transferToCategory) {
        const targetCategory = await this.categoryRepository.findById(transferToCategory);
        if (!targetCategory) {
          throw new ValidationError('Transfer target category not found');
        }
        
        if (targetCategory.userId !== category.userId) {
          throw new ValidationError('Transfer target category does not belong to user');
        }
      }

      // TODO: Move QR codes to transfer category or null
      // This would be handled by the QR service
      
      const deleted = await this.categoryRepository.delete(id);

      this.logger.info('Category deleted successfully', { 
        categoryId: id, 
        deleted,
        transferToCategory 
      });

      return {
        success: true,
        data: deleted,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to delete category', { error, categoryId: id });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: error.message,
            statusCode: 404
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CATEGORY_DELETE_FAILED',
          message: 'Failed to delete category',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get category tree structure
   */
  async getCategoryTree(userId: string): Promise<ServiceResponse<QRCategoryTree>> {
    try {
      this.logger.info('Building category tree', { userId });

      const categoriesWithCounts = await this.categoryRepository.getCategoryWithQRCount(userId);
      
      // Build tree structure
      const tree = this.buildCategoryTree(categoriesWithCounts);
      
      const categoryTree: QRCategoryTree = {
        categories: tree,
        totalCategories: categoriesWithCounts.length,
        maxDepth: this.calculateMaxDepth(tree)
      };

      return {
        success: true,
        data: categoryTree,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Failed to build category tree', { error, userId });

      return {
        success: false,
        error: {
          code: 'CATEGORY_TREE_FAILED',
          message: 'Failed to build category tree',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Move QR codes to category
   */
  async moveQRsToCategory(qrIds: string[], categoryId: string | null): Promise<ServiceResponse<number>> {
    try {
      this.logger.info('Moving QR codes to category', { qrCount: qrIds.length, categoryId });

      if (qrIds.length === 0) {
        return {
          success: true,
          data: 0,
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
      }

      // Validate category exists if not null
      if (categoryId) {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) {
          throw new ValidationError('Target category not found');
        }
      }

      const movedCount = await this.categoryRepository.moveQRsToCategory(qrIds, categoryId);

      this.logger.info('QR codes moved successfully', { 
        movedCount, 
        categoryId,
        requestedCount: qrIds.length 
      });

      return {
        success: true,
        data: movedCount,
        metadata: {
          timestamp: new Date().toISOString(),
          total: movedCount
        }
      };

    } catch (error) {
      this.logger.error('Failed to move QR codes to category', { error, qrIds, categoryId });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            statusCode: 400
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'QR_MOVE_FAILED',
          message: 'Failed to move QR codes',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(userId: string): Promise<ServiceResponse<CategoryStats[]>> {
    try {
      this.logger.info('Fetching category statistics', { userId });

      const categoriesWithCounts = await this.categoryRepository.getCategoryWithQRCount(userId);
      
      // TODO: Add more detailed stats from QR and analytics tables
      const stats: CategoryStats[] = categoriesWithCounts.map(category => ({
        categoryId: category.id,
        categoryName: category.name,
        color: category.color,
        icon: category.icon,
        qrCount: category.qrCount,
        totalScans: 0, // TODO: Calculate from analytics
        activeQRs: category.qrCount, // TODO: Filter active QRs
        expiredQRs: 0, // TODO: Calculate expired QRs
        recentActivity: null // TODO: Get most recent activity
      }));

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          total: stats.length
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch category statistics', { error, userId });

      return {
        success: false,
        error: {
          code: 'CATEGORY_STATS_FAILED',
          message: 'Failed to fetch category statistics',
          statusCode: 500
        }
      };
    }
  }

  /**
   * Private helper methods
   */

  private validateCategoryData(data: CreateCategoryRequest, requireName: boolean = true): { isValid: boolean; message: string; errors?: string[] } {
    const errors: string[] = [];

    if (requireName && (!data.name || data.name.trim().length === 0)) {
      errors.push('Category name is required');
    }

    if (data.name && data.name.trim().length > 255) {
      errors.push('Category name must not exceed 255 characters');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Category description must not exceed 1000 characters');
    }

    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      errors.push('Category color must be a valid hex color (e.g., #3B82F6)');
    }

    if (data.icon && data.icon.length > 10) {
      errors.push('Category icon must not exceed 10 characters');
    }

    if (data.sortOrder !== undefined && (data.sortOrder < 0 || data.sortOrder > 9999)) {
      errors.push('Sort order must be between 0 and 9999');
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? 'Validation failed' : 'Valid',
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async validateCategoryMove(categoryId: string, newParentId: string): Promise<boolean> {
    // Prevent circular references
    const category = await this.categoryRepository.findById(newParentId);
    if (!category) return false;

    // Check if newParentId is a descendant of categoryId
    let currentParentId = category.parentId;
    while (currentParentId) {
      if (currentParentId === categoryId) {
        return false; // Circular reference detected
      }
      
      const parentCategory = await this.categoryRepository.findById(currentParentId);
      if (!parentCategory) break;
      
      currentParentId = parentCategory.parentId;
    }

    return true;
  }

  private buildCategoryTree(categories: Array<QRCategory & { qrCount: number }>): QRCategoryTreeNode[] {
    const categoryMap = new Map<string, QRCategoryTreeNode>();
    const rootCategories: QRCategoryTreeNode[] = [];

    // Create tree nodes
    categories.forEach(category => {
      const node: QRCategoryTreeNode = {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isDefault: category.isDefault,
        sortOrder: category.sortOrder,
        qrCount: category.qrCount,
        children: [],
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };
      
      categoryMap.set(category.id, node);
    });

    // Build hierarchy
    categories.forEach(category => {
      const node = categoryMap.get(category.id)!;
      
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          rootCategories.push(node); // Orphaned category
        }
      } else {
        rootCategories.push(node);
      }
    });

    // Sort children
    const sortNodes = (nodes: QRCategoryTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
      
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootCategories);
    
    return rootCategories;
  }

  private calculateMaxDepth(nodes: QRCategoryTreeNode[], currentDepth: number = 1): number {
    if (nodes.length === 0) return 0;
    
    let maxDepth = currentDepth;
    
    nodes.forEach(node => {
      if (node.children.length > 0) {
        const childDepth = this.calculateMaxDepth(node.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    });
    
    return maxDepth;
  }
}