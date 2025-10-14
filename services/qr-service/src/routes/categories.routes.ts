import { Request, Response, Router } from 'express';
import { QRCategoryService } from '../services/qr-category.service';
import { QRCategoryRepository } from '../repositories/qr-category.repository';
import { Logger } from '../services/logger.service';
import { Pool } from 'pg';

// Extend Express Request type for user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();
const logger = new Logger();

// TODO: Inject these dependencies properly
const database = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qrgen',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

// Initialize dependencies
const categoryRepository = new QRCategoryRepository(database, logger);
const categoryService = new QRCategoryService(categoryRepository, logger);

// Simple validation helper
const validateUserId = (req: AuthRequest): string => {
  return req.user?.id || 'test-user-id'; // TODO: Replace with proper auth
};

// Create category
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await categoryService.createCategory(userId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to create category', { error, userId: validateUserId(req) });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create category'
      }
    });
  }
});

// Get user categories
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const options = {
      includeEmpty: req.query.includeEmpty === 'true',
      parentId: req.query.parentId as string
    };

    const result = await categoryService.getUserCategories(userId, options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get categories', { error, userId: validateUserId(req) });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get categories'
      }
    });
  }
});

// Get category tree
router.get('/tree', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await categoryService.getCategoryTree(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get category tree', { error, userId: validateUserId(req) });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get category tree'
      }
    });
  }
});

// Get category stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await categoryService.getCategoryStats(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get category stats', { error, userId: validateUserId(req) });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get category stats'
      }
    });
  }
});

// Get category by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await categoryService.getCategoryById(req.params.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get category by ID', { error, categoryId: req.params.id });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get category'
      }
    });
  }
});

// Update category
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await categoryService.updateCategory(req.params.id, req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to update category', { error, categoryId: req.params.id });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update category'
      }
    });
  }
});

// Delete category
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const transferTo = req.query.transferTo as string;
    const result = await categoryService.deleteCategory(req.params.id, transferTo);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to delete category', { error, categoryId: req.params.id });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete category'
      }
    });
  }
});

// Move QR codes to category
router.post('/move-qrs', async (req: AuthRequest, res: Response) => {
  try {
    const { qrIds, categoryId } = req.body;
    const result = await categoryService.moveQRsToCategory(qrIds, categoryId || null);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to move QR codes', { error, body: req.body });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to move QR codes'
      }
    });
  }
});

export default router;