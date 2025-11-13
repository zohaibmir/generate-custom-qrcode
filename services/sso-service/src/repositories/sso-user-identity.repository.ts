import { Pool } from 'pg';
import { SSOUserIdentity } from '../types/sso.types';

export class SSOUserIdentityRepository {
  constructor(private pool: Pool) {}

  async findAll(userId: string): Promise<SSOUserIdentity[]> {
    const query = `
      SELECT 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sso_user_identities 
      WHERE user_id = $1
      ORDER BY last_login_at DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async findById(id: string): Promise<SSOUserIdentity | null> {
    const query = `
      SELECT 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sso_user_identities 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByExternalId(providerId: string, externalId: string): Promise<SSOUserIdentity | null> {
    const query = `
      SELECT 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sso_user_identities 
      WHERE provider_id = $1 AND external_id = $2
    `;
    
    const result = await this.pool.query(query, [providerId, externalId]);
    return result.rows[0] || null;
  }

  async findByExternalEmail(providerId: string, externalEmail: string): Promise<SSOUserIdentity | null> {
    const query = `
      SELECT 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sso_user_identities 
      WHERE provider_id = $1 AND external_email = $2 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [providerId, externalEmail]);
    return result.rows[0] || null;
  }

  async findByProvider(providerId: string): Promise<SSOUserIdentity[]> {
    const query = `
      SELECT 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sso_user_identities 
      WHERE provider_id = $1 AND is_active = true
      ORDER BY last_login_at DESC
    `;
    
    const result = await this.pool.query(query, [providerId]);
    return result.rows;
  }

  async create(identity: Omit<SSOUserIdentity, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSOUserIdentity> {
    const query = `
      INSERT INTO sso_user_identities (
        user_id, provider_id, external_id, external_username, external_email,
        external_display_name, attributes, first_login_at, last_login_at,
        login_count, is_active, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const values = [
      identity.userId,
      identity.providerId,
      identity.externalId,
      identity.externalUsername,
      identity.externalEmail,
      identity.externalDisplayName,
      JSON.stringify(identity.attributes),
      identity.firstLoginAt,
      identity.lastLoginAt,
      identity.loginCount,
      identity.isActive,
      identity.isVerified
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id: string, updates: Partial<SSOUserIdentity>): Promise<SSOUserIdentity> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateFields = [
      'externalUsername', 'externalEmail', 'externalDisplayName', 'attributes',
      'lastLoginAt', 'loginCount', 'isActive', 'isVerified'
    ];

    const columnMapping: Record<string, string> = {
      'externalUsername': 'external_username',
      'externalEmail': 'external_email',
      'externalDisplayName': 'external_display_name',
      'lastLoginAt': 'last_login_at',
      'loginCount': 'login_count',
      'isActive': 'is_active',
      'isVerified': 'is_verified'
    };

    for (const field of updateFields) {
      if (field in updates) {
        const dbColumn = columnMapping[field] || field;
        fields.push(`${dbColumn} = $${paramIndex}`);
        
        let value = updates[field as keyof SSOUserIdentity];
        if (field === 'attributes' && value) {
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
      UPDATE sso_user_identities 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateLoginInfo(id: string, loginAt: Date = new Date()): Promise<SSOUserIdentity> {
    const query = `
      UPDATE sso_user_identities 
      SET last_login_at = $2, login_count = login_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, user_id as "userId", provider_id as "providerId", external_id as "externalId",
        external_username as "externalUsername", external_email as "externalEmail",
        external_display_name as "externalDisplayName", attributes,
        first_login_at as "firstLoginAt", last_login_at as "lastLoginAt",
        login_count as "loginCount", is_active as "isActive", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, [id, loginAt]);
    return result.rows[0];
  }

  async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE sso_user_identities 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async activate(id: string): Promise<boolean> {
    const query = `
      UPDATE sso_user_identities 
      SET is_active = true, updated_at = NOW()
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM sso_user_identities WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByProvider(providerId: string): Promise<number> {
    const query = 'DELETE FROM sso_user_identities WHERE provider_id = $1';
    const result = await this.pool.query(query, [providerId]);
    return result.rowCount ?? 0;
  }

  async getLoginStats(providerId: string, days: number = 30): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_identities,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '${days} days' THEN 1 END) as active_identities,
        AVG(login_count) as avg_login_count,
        MAX(last_login_at) as most_recent_login
      FROM sso_user_identities 
      WHERE provider_id = $1 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [providerId]);
    return result.rows[0];
  }
}