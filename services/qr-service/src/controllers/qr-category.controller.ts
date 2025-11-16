import { Request, Response } from 'express';
import { 
  IQRCategoryService, 
  ILogger, 
  ServiceResponse, 
  AppError, 
  QRCategory, 
  CreateCategoryRequest, 
  CategoryQueryOptions 
} from '../interfaces';

/**
 * QR Category Controller - Clean Architecture Implementation
 * 
 * Following SOLID Principles:
 * - Single Responsibility: Only handles HTTP concerns for QR category operations
 * - Open/Closed: Extensible without modifying existing code  
 * - Liskov Substitution: Can be substituted with any IQRCategoryController implementation
 * - Interface Segregation: Uses focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export class QRCategoryController {
  constructor(
    private readonly categoryService: IQRCategoryService,
    private readonly logger: ILogger
  ) {}

  /**
   * Extract user context from Auth System v2.0
   */
  private extractUserContext(req: Request): { userId: string; userTier: string } {
    const auth = (req as any).auth;
    
    if (!auth?.userId) {
      throw new AppError('Authentication required - user ID not found', 401, 'AUTHENTICATION_REQUIRED');
    }
    
    return {
      userId: auth.userId,
      userTier: auth.subscriptionTier || 'free'
    };
  }

  /**
   * Handle service response and send appropriate HTTP response
   */
  private handleServiceResponse<T>(res: Response, result: ServiceResponse<T>): void {
    const statusCode = result.success ? 
      (result.data ? 200 : 204) : 
      (result.error?.statusCode || 500);
    
    res.status(statusCode).json(result);
  }

  /**
   * Handle controller errors with proper logging and response
   */
  private handleError(error: any, res: Response, operation: string, requestId?: string): void {
    this.logger.error(`${operation} failed`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          requestId
        }
      });
    }
  }

  /**
   * Create QR Category
   * POST /categories
   */
  createCategory = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId } = this.extractUserContext(req);
      const categoryData: CreateCategoryRequest = req.body;
      
      this.logger.info('Creating QR category', {
        requestId,
        userId,
        categoryName: categoryData.name
      });

      const result = await this.categoryService.createCategory(userId, categoryData);
      
      const statusCode = result.success ? 201 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_CREATION', requestId);
    }
  };

  /**
   * Get Category by ID
   * GET /categories/:id
   */
  getCategoryById = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      
      this.logger.info('Fetching category by ID', {
        requestId,
        categoryId: id
      });

      const result = await this.categoryService.getCategoryById(id);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_FETCH_BY_ID', requestId);
    }
  };

  /**
   * Get User Categories
   * GET /categories
   */
  getUserCategories = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId } = this.extractUserContext(req);
      
      const options: CategoryQueryOptions = {
        includeChildren: req.query.includeChildren === 'true',
        parentId: req.query.parentId as string || undefined,
        sortBy: (req.query.sortBy as any) || 'name',
        sortOrder: (req.query.sortOrder as any) || 'asc'
      };
      
      this.logger.info('Fetching user categories', {
        requestId,
        userId,
        options
      });

      const result = await this.categoryService.getUserCategories(userId, options);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'USER_CATEGORIES_FETCH', requestId);
    }
  };

  /**
   * Update Category
   * PUT /categories/:id
   */
  updateCategory = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const updateData: Partial<CreateCategoryRequest> = req.body;
      
      this.logger.info('Updating category', {
        requestId,
        categoryId: id,
        updateFields: Object.keys(updateData)
      });

      const result = await this.categoryService.updateCategory(id, updateData);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_UPDATE', requestId);
    }
  };

  /**
   * Delete Category
   * DELETE /categories/:id
   */
  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const transferToCategory = req.query.transferTo as string;
      
      this.logger.info('Deleting category', {
        requestId,
        categoryId: id,
        transferToCategory
      });

      const result = await this.categoryService.deleteCategory(id, transferToCategory);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_DELETE', requestId);
    }
  };

  /**
   * Get Category Tree
   * GET /categories/tree
   */
  getCategoryTree = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId } = this.extractUserContext(req);
      
      this.logger.info('Fetching category tree', {
        requestId,
        userId
      });

      const result = await this.categoryService.getCategoryTree(userId);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_TREE_FETCH', requestId);
    }
  };

  /**
   * Move QRs to Category
   * POST /categories/:id/move-qrs
   */
  moveQRsToCategory = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { id } = req.params;
      const { qrIds } = req.body;
      
      if (!Array.isArray(qrIds)) {
        throw new AppError('qrIds must be an array', 400, 'VALIDATION_ERROR');
      }
      
      this.logger.info('Moving QRs to category', {
        requestId,
        categoryId: id,
        qrCount: qrIds.length
      });

      const categoryId = id === 'null' ? null : id;
      const result = await this.categoryService.moveQRsToCategory(qrIds, categoryId);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'QR_MOVE_TO_CATEGORY', requestId);
    }
  };

  /**
   * Get Category Statistics
   * GET /categories/stats
   */
  getCategoryStats = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const { userId } = this.extractUserContext(req);
      
      this.logger.info('Fetching category statistics', {
        requestId,
        userId
      });

      const result = await this.categoryService.getCategoryStats(userId);
      this.handleServiceResponse(res, result);
      
    } catch (error) {
      this.handleError(error, res, 'CATEGORY_STATS_FETCH', requestId);
    }
  };
}