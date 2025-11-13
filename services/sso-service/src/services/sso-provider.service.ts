import { Pool } from 'pg';
import {
  SSOProvider,
  SSOProviderServiceInterface,
  SSOProviderType,
  SSOProviderStatus,
} from '../types/sso.types';
import { SSOProviderRepository } from '../repositories/sso-provider.repository';
import { SSOProviderFactoryImpl } from '../providers/sso-provider-factory';

export class SSOProviderService implements SSOProviderServiceInterface {
  private repository: SSOProviderRepository;
  private factory: SSOProviderFactoryImpl;

  constructor(private pool: Pool) {
    this.repository = new SSOProviderRepository(pool);
    this.factory = SSOProviderFactoryImpl.getInstance();
  }

  async getProviders(organizationId: string): Promise<SSOProvider[]> {
    try {
      return await this.repository.findAll(organizationId);
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
      throw new Error('Failed to fetch SSO providers');
    }
  }

  async getEnabledProviders(organizationId: string): Promise<SSOProvider[]> {
    try {
      return await this.repository.findEnabled(organizationId);
    } catch (error) {
      console.error('Error fetching enabled SSO providers:', error);
      throw new Error('Failed to fetch enabled SSO providers');
    }
  }

  async getProvider(id: string): Promise<SSOProvider | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      console.error('Error fetching SSO provider:', error);
      throw new Error('Failed to fetch SSO provider');
    }
  }

  async getProviderByName(organizationId: string, name: string): Promise<SSOProvider | null> {
    try {
      return await this.repository.findByName(organizationId, name);
    } catch (error) {
      console.error('Error fetching SSO provider by name:', error);
      throw new Error('Failed to fetch SSO provider by name');
    }
  }

  async createProvider(
    providerData: Omit<SSOProvider, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SSOProvider> {
    try {
      // Validate provider type
      const supportedTypes = this.factory.getSupportedTypes();
      if (!supportedTypes.includes(providerData.type)) {
        throw new Error(`Unsupported provider type: ${providerData.type}`);
      }

      // Check if provider with same name already exists
      const existingProvider = await this.repository.findByName(
        providerData.organizationId,
        providerData.name
      );
      if (existingProvider) {
        throw new Error('Provider with this name already exists');
      }

      // Validate configuration based on provider type
      const requiredFields = this.factory.getRequiredFields(providerData.type);
      this.validateProviderConfiguration(providerData.configuration, requiredFields);

      // Create provider
      const provider = await this.repository.create({
        ...providerData,
        errorCount: 0,
        status: 'active',
      });

      return provider;
    } catch (error) {
      console.error('Error creating SSO provider:', error);
      throw new Error(`Failed to create SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProvider(id: string, updates: Partial<SSOProvider>): Promise<SSOProvider> {
    try {
      const provider = await this.repository.findById(id);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      // If configuration is being updated, validate it
      if (updates.configuration) {
        const requiredFields = this.factory.getRequiredFields(provider.type);
        this.validateProviderConfiguration(updates.configuration, requiredFields);
      }

      // If name is being updated, check for conflicts
      if (updates.name && updates.name !== provider.name) {
        const existingProvider = await this.repository.findByName(
          provider.organizationId,
          updates.name
        );
        if (existingProvider) {
          throw new Error('Provider with this name already exists');
        }
      }

      // Clear cached handlers if configuration changed
      if (updates.configuration || updates.isEnabled !== undefined) {
        this.factory.removeProvider(id);
      }

      return await this.repository.update(id, updates);
    } catch (error) {
      console.error('Error updating SSO provider:', error);
      throw new Error(`Failed to update SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      const provider = await this.repository.findById(id);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      // Remove from cache
      this.factory.removeProvider(id);

      // Delete from database
      return await this.repository.delete(id);
    } catch (error) {
      console.error('Error deleting SSO provider:', error);
      throw new Error(`Failed to delete SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testProvider(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const provider = await this.repository.findById(id);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      // Test the provider using the factory
      const result = await this.factory.testProvider(provider);

      // Update test results in database
      await this.repository.updateTestResult(id, result.success, result.message);

      if (result.success) {
        await this.repository.resetErrorCount(id);
      } else {
        await this.repository.incrementErrorCount(id, result.message);
      }

      return result;
    } catch (error) {
      console.error('Error testing SSO provider:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update error count
      await this.repository.incrementErrorCount(id, errorMessage);

      return {
        success: false,
        message: `Provider test failed: ${errorMessage}`,
      };
    }
  }

  async enableProvider(id: string): Promise<SSOProvider> {
    try {
      const provider = await this.repository.findById(id);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      // Test the provider before enabling
      const testResult = await this.testProvider(id);
      if (!testResult.success) {
        throw new Error(`Cannot enable provider: ${testResult.message}`);
      }

      return await this.repository.update(id, {
        isEnabled: true,
        status: 'active' as SSOProviderStatus,
      });
    } catch (error) {
      console.error('Error enabling SSO provider:', error);
      throw new Error(`Failed to enable SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disableProvider(id: string): Promise<SSOProvider> {
    try {
      const provider = await this.repository.findById(id);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      // Remove from cache
      this.factory.removeProvider(id);

      return await this.repository.update(id, {
        isEnabled: false,
        status: 'inactive' as SSOProviderStatus,
      });
    } catch (error) {
      console.error('Error disabling SSO provider:', error);
      throw new Error(`Failed to disable SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setDefaultProvider(organizationId: string, providerId: string): Promise<void> {
    try {
      const provider = await this.repository.findById(providerId);
      if (!provider) {
        throw new Error('SSO provider not found');
      }

      if (provider.organizationId !== organizationId) {
        throw new Error('Provider does not belong to the specified organization');
      }

      if (!provider.isEnabled) {
        throw new Error('Cannot set disabled provider as default');
      }

      await this.repository.setDefault(organizationId, providerId);
    } catch (error) {
      console.error('Error setting default SSO provider:', error);
      throw new Error(`Failed to set default SSO provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods

  getSupportedProviderTypes(): SSOProviderType[] {
    return this.factory.getSupportedTypes();
  }

  getProviderTemplate(type: SSOProviderType): any {
    return this.factory.getProviderTemplate(type);
  }

  getRequiredFields(type: SSOProviderType): string[] {
    return this.factory.getRequiredFields(type);
  }

  private validateProviderConfiguration(config: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      const fieldParts = field.split('.');
      let value = config;
      
      for (const part of fieldParts) {
        value = value?.[part];
      }
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  // Bulk operations

  async bulkUpdateProviders(organizationId: string, updates: Partial<SSOProvider>): Promise<SSOProvider[]> {
    try {
      const providers = await this.repository.findAll(organizationId);
      const updatedProviders: SSOProvider[] = [];

      for (const provider of providers) {
        try {
          const updatedProvider = await this.updateProvider(provider.id, updates);
          updatedProviders.push(updatedProvider);
        } catch (error) {
          console.error(`Error updating provider ${provider.id}:`, error);
          // Continue with other providers
        }
      }

      return updatedProviders;
    } catch (error) {
      console.error('Error bulk updating SSO providers:', error);
      throw new Error('Failed to bulk update SSO providers');
    }
  }

  async getProviderStats(organizationId: string): Promise<any> {
    try {
      const providers = await this.repository.findAll(organizationId);
      
      const stats = {
        total: providers.length,
        enabled: providers.filter(p => p.isEnabled).length,
        disabled: providers.filter(p => !p.isEnabled).length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        withErrors: providers.filter(p => p.errorCount > 0).length,
        lastTested: providers
          .filter(p => p.lastTestAt)
          .reduce((latest, p) => 
            !latest || (p.lastTestAt && p.lastTestAt > latest) ? (p.lastTestAt || null) : latest, 
            null as Date | null
          ),
      };

      // Count by type
      for (const provider of providers) {
        stats.byType[provider.type] = (stats.byType[provider.type] || 0) + 1;
        stats.byStatus[provider.status] = (stats.byStatus[provider.status] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('Error getting provider stats:', error);
      throw new Error('Failed to get provider stats');
    }
  }
}