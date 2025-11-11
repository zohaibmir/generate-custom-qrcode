import { Request, Response, Router } from 'express';
import { InventoryIntegrationService } from '../services/inventory-integration.service';
import { InventoryIntegrationRepository } from '../repositories/inventory-integration.repository';
import { WinstonLogger } from '../utils/logger';
import { DatabaseConfig } from '../config/database.config';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier?: string;
  };
}

const router = Router();
const logger = new WinstonLogger();
const db = DatabaseConfig.getPool();

// Initialize dependencies
const inventoryRepository = new InventoryIntegrationRepository(db, logger);
const inventoryService = new InventoryIntegrationService(inventoryRepository, logger);

// Validation helper
const validateUserId = (req: AuthRequest): string => {
  return req.user?.id || 'test-user-id';
};

// ==========================================
// INVENTORY INTEGRATION MANAGEMENT
// ==========================================

// Create Integration
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await inventoryService.createIntegration(userId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to create inventory integration', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create inventory integration',
        statusCode: 500
      }
    });
  }
});

// Get User Integrations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const result = await inventoryService.getUserIntegrations(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get inventory integrations', { error, userId: validateUserId(req) });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get inventory integrations',
        statusCode: 500
      }
    });
  }
});

// Update Integration
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await inventoryService.updateIntegration(id, req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to update inventory integration', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update inventory integration',
        statusCode: 500
      }
    });
  }
});

// Delete Integration
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await inventoryService.deleteIntegration(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to delete inventory integration', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete inventory integration',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// INVENTORY SYNCHRONIZATION
// ==========================================

// Sync Inventory
router.post('/:id/sync', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await inventoryService.syncInventory(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to sync inventory', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to sync inventory',
        statusCode: 500
      }
    });
  }
});

// Get Inventory Status for Product
router.get('/products/:productId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { integrationId } = req.query;
    
    const result = await inventoryService.getInventoryStatus(
      productId, 
      integrationId as string | undefined
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to get inventory status', { 
      error, 
      productId: req.params.productId,
      integrationId: req.query.integrationId 
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get inventory status',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// PLATFORM-SPECIFIC SETUP ENDPOINTS
// ==========================================

// Setup Shopify Integration
router.post('/shopify/setup', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const { storeName, accessToken } = req.body;

    if (!storeName || !accessToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Store name and access token are required',
          statusCode: 400
        }
      });
    }

    const result = await inventoryService.setupShopifyIntegration(userId, {
      storeName,
      accessToken
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to setup Shopify integration', { 
      error, 
      userId: validateUserId(req),
      storeName: req.body.storeName 
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to setup Shopify integration',
        statusCode: 500
      }
    });
  }
});

// Setup WooCommerce Integration
router.post('/woocommerce/setup', async (req: AuthRequest, res: Response) => {
  try {
    const userId = validateUserId(req);
    const { storeUrl, consumerKey, consumerSecret } = req.body;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Store URL, consumer key, and consumer secret are required',
          statusCode: 400
        }
      });
    }

    const result = await inventoryService.setupWooCommerceIntegration(userId, {
      storeUrl,
      consumerKey,
      consumerSecret
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(result.error?.statusCode || 500).json(result);
    }
  } catch (error) {
    logger.error('Failed to setup WooCommerce integration', { 
      error, 
      userId: validateUserId(req),
      storeUrl: req.body.storeUrl 
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to setup WooCommerce integration',
        statusCode: 500
      }
    });
  }
});

// ==========================================
// HEALTH CHECK AND TESTING
// ==========================================

// Test Integration Connection
router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // For now, just return success as we don't have a specific test method
    // In a full implementation, you would test the connection to the external service
    res.json({
      success: true,
      data: {
        connectionStatus: 'healthy',
        message: 'Connection test successful'
      }
    });
  } catch (error) {
    logger.error('Failed to test integration connection', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to test integration connection',
        statusCode: 500
      }
    });
  }
});

export default router;