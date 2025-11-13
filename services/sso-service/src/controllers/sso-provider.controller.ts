import { Request, Response } from 'express';
import { SSOProviderService } from '../services/sso-provider.service';
import { SSOService } from '../services/sso.service';
import { SSOProviderType } from '../types/sso.types';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

export class SSOProviderController {
  constructor(
    private providerService: SSOProviderService,
    private ssoService: SSOService
  ) {}

  // Get all SSO providers for an organization
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const providers = await this.providerService.getProviders(organizationId);
      res.json({ providers });
    } catch (error) {
      console.error('Error getting SSO providers:', error);
      res.status(500).json({ 
        error: 'Failed to get SSO providers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get enabled SSO providers for an organization
  async getEnabledProviders(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const providers = await this.providerService.getEnabledProviders(organizationId);
      res.json({ providers });
    } catch (error) {
      console.error('Error getting enabled SSO providers:', error);
      res.status(500).json({ 
        error: 'Failed to get enabled SSO providers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get a specific SSO provider
  async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const provider = await this.providerService.getProvider(id);
      if (!provider) {
        res.status(404).json({ error: 'SSO provider not found' });
        return;
      }

      res.json({ provider });
    } catch (error) {
      console.error('Error getting SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to get SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create a new SSO provider
  async createProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const providerData = req.body;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Validate required fields
      if (!providerData.name || !providerData.type || !providerData.configuration) {
        res.status(400).json({ error: 'Name, type, and configuration are required' });
        return;
      }

      const provider = await this.providerService.createProvider({
        ...providerData,
        organizationId,
        isEnabled: providerData.isEnabled ?? true,
        isDefault: providerData.isDefault ?? false,
        sortOrder: providerData.sortOrder ?? 0,
        forceAuthn: providerData.forceAuthn ?? false,
        allowCreateUser: providerData.allowCreateUser ?? true,
        requireEmailVerification: providerData.requireEmailVerification ?? false,
        status: 'active',
        errorCount: 0,
        createdBy: req.user?.id, // Assuming user is attached to request
      });

      res.status(201).json({ provider });
    } catch (error) {
      console.error('Error creating SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to create SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update an SSO provider
  async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const provider = await this.providerService.updateProvider(id, updates);
      res.json({ provider });
    } catch (error) {
      console.error('Error updating SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to update SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete an SSO provider
  async deleteProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const success = await this.providerService.deleteProvider(id);
      if (!success) {
        res.status(404).json({ error: 'SSO provider not found' });
        return;
      }

      res.json({ message: 'SSO provider deleted successfully' });
    } catch (error) {
      console.error('Error deleting SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to delete SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test an SSO provider
  async testProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.providerService.testProvider(id);
      res.json(result);
    } catch (error) {
      console.error('Error testing SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to test SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Enable an SSO provider
  async enableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const provider = await this.providerService.enableProvider(id);
      res.json({ provider, message: 'SSO provider enabled successfully' });
    } catch (error) {
      console.error('Error enabling SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to enable SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Disable an SSO provider
  async disableProvider(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const provider = await this.providerService.disableProvider(id);
      res.json({ provider, message: 'SSO provider disabled successfully' });
    } catch (error) {
      console.error('Error disabling SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to disable SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Set default SSO provider
  async setDefaultProvider(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, id } = req.params;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      await this.providerService.setDefaultProvider(organizationId, id);
      res.json({ message: 'Default SSO provider set successfully' });
    } catch (error) {
      console.error('Error setting default SSO provider:', error);
      res.status(500).json({ 
        error: 'Failed to set default SSO provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get supported provider types
  async getSupportedTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = this.providerService.getSupportedProviderTypes();
      res.json({ types });
    } catch (error) {
      console.error('Error getting supported provider types:', error);
      res.status(500).json({ 
        error: 'Failed to get supported provider types',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get provider template
  async getProviderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      if (!type) {
        res.status(400).json({ error: 'Provider type is required' });
        return;
      }

      const template = this.providerService.getProviderTemplate(type as SSOProviderType);
      const requiredFields = this.providerService.getRequiredFields(type as SSOProviderType);
      
      res.json({ template, requiredFields });
    } catch (error) {
      console.error('Error getting provider template:', error);
      res.status(500).json({ 
        error: 'Failed to get provider template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get provider statistics
  async getProviderStats(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const stats = await this.providerService.getProviderStats(organizationId);
      res.json({ stats });
    } catch (error) {
      console.error('Error getting provider stats:', error);
      res.status(500).json({ 
        error: 'Failed to get provider stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get provider login statistics
  async getProviderLoginStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { days = '30' } = req.query;

      const stats = await this.ssoService.getProviderLoginStats(id, parseInt(days as string));
      res.json({ stats });
    } catch (error) {
      console.error('Error getting provider login stats:', error);
      res.status(500).json({ 
        error: 'Failed to get provider login stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}