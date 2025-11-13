import { Pool } from 'pg';
import {
  SSOProvider,
  SSOProviderType,
  SSOProviderStatus,
} from '../types/sso.types';

export class SSOProviderRepository {
  constructor(private pool: Pool) {}

  async findAll(organizationId: string): Promise<SSOProvider[]> {
    const query = `
      SELECT 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
      FROM sso_providers 
      WHERE organization_id = $1 
      ORDER BY sort_order, created_at
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows;
  }

  async findById(id: string): Promise<SSOProvider | null> {
    const query = `
      SELECT 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
      FROM sso_providers 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByName(organizationId: string, name: string): Promise<SSOProvider | null> {
    const query = `
      SELECT 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
      FROM sso_providers 
      WHERE organization_id = $1 AND name = $2
    `;
    
    const result = await this.pool.query(query, [organizationId, name]);
    return result.rows[0] || null;
  }

  async findEnabled(organizationId: string): Promise<SSOProvider[]> {
    const query = `
      SELECT 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
      FROM sso_providers 
      WHERE organization_id = $1 AND is_enabled = true AND status = 'active'
      ORDER BY is_default DESC, sort_order, created_at
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows;
  }

  async create(provider: Omit<SSOProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSOProvider> {
    const query = `
      INSERT INTO sso_providers (
        organization_id, name, type, is_enabled, is_default, display_name, description,
        logo_url, button_text, sort_order, configuration, force_authn, allow_create_user,
        require_email_verification, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
    `;
    
    const values = [
      provider.organizationId,
      provider.name,
      provider.type,
      provider.isEnabled,
      provider.isDefault,
      provider.displayName,
      provider.description,
      provider.logoUrl,
      provider.buttonText,
      provider.sortOrder,
      JSON.stringify(provider.configuration),
      provider.forceAuthn,
      provider.allowCreateUser,
      provider.requireEmailVerification,
      provider.status,
      provider.createdBy
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<SSOProvider>): Promise<SSOProvider> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateFields = [
      'name', 'type', 'isEnabled', 'isDefault', 'displayName', 'description',
      'logoUrl', 'buttonText', 'sortOrder', 'configuration', 'forceAuthn',
      'allowCreateUser', 'requireEmailVerification', 'status', 'lastTestAt',
      'lastTestResult', 'errorCount', 'lastError'
    ];

    const columnMapping: Record<string, string> = {
      'isEnabled': 'is_enabled',
      'isDefault': 'is_default',
      'displayName': 'display_name',
      'logoUrl': 'logo_url',
      'buttonText': 'button_text',
      'sortOrder': 'sort_order',
      'forceAuthn': 'force_authn',
      'allowCreateUser': 'allow_create_user',
      'requireEmailVerification': 'require_email_verification',
      'lastTestAt': 'last_test_at',
      'lastTestResult': 'last_test_result',
      'errorCount': 'error_count',
      'lastError': 'last_error'
    };

    for (const field of updateFields) {
      if (field in updates) {
        const dbColumn = columnMapping[field] || field;
        fields.push(`${dbColumn} = $${paramIndex}`);
        
        let value = updates[field as keyof SSOProvider];
        if (field === 'configuration' && value) {
          value = JSON.stringify(value);
        }
        
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE sso_providers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, organization_id as "organizationId", name, type, is_enabled as "isEnabled",
        is_default as "isDefault", display_name as "displayName", description,
        logo_url as "logoUrl", button_text as "buttonText", sort_order as "sortOrder",
        configuration, force_authn as "forceAuthn", allow_create_user as "allowCreateUser",
        require_email_verification as "requireEmailVerification", status,
        last_test_at as "lastTestAt", last_test_result as "lastTestResult",
        error_count as "errorCount", last_error as "lastError",
        created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM sso_providers WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async setDefault(organizationId: string, providerId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Unset all providers as default
      await client.query(
        'UPDATE sso_providers SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
      
      // Set the specified provider as default
      await client.query(
        'UPDATE sso_providers SET is_default = true WHERE id = $1 AND organization_id = $2',
        [providerId, organizationId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async incrementErrorCount(id: string, error?: string): Promise<void> {
    const query = `
      UPDATE sso_providers 
      SET error_count = error_count + 1, last_error = $2, updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [id, error]);
  }

  async resetErrorCount(id: string): Promise<void> {
    const query = `
      UPDATE sso_providers 
      SET error_count = 0, last_error = NULL, updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [id]);
  }

  async updateTestResult(id: string, success: boolean, message: string): Promise<void> {
    const query = `
      UPDATE sso_providers 
      SET last_test_at = NOW(), last_test_result = $2, updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [id, success ? 'SUCCESS: ' + message : 'ERROR: ' + message]);
  }
}