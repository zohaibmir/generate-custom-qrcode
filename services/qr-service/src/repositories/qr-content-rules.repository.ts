import { Pool } from 'pg';
import { ILogger, DatabaseError } from '../interfaces';

export interface QRContentRule {
  id: string;
  qr_code_id: string;
  rule_name: string;
  rule_type: 'time' | 'location' | 'language' | 'device';
  rule_data: any;
  content_type: 'url' | 'text' | 'landing_page';
  content_value: string;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class QRContentRulesRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  /**
   * Create a new content rule
   */
  async createRule(ruleData: {
    qr_code_id: string;
    rule_name: string;
    rule_type: string;
    rule_data: any;
    content_type: string;
    content_value: string;
    priority: number;
    is_active: boolean;
  }): Promise<QRContentRule> {
    try {
      const query = `
        INSERT INTO qr_content_rules (
          qr_code_id, rule_name, rule_type, rule_data, content_type, 
          content_value, priority, is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        ruleData.qr_code_id,
        ruleData.rule_name,
        ruleData.rule_type,
        JSON.stringify(ruleData.rule_data),
        ruleData.content_type,
        ruleData.content_value,
        ruleData.priority,
        ruleData.is_active
      ];

      this.logger.debug('Creating content rule', { qrCodeId: ruleData.qr_code_id, ruleType: ruleData.rule_type });

      const result = await this.db.query(query, values);
      const rule = result.rows[0];

      // Parse JSON rule_data
      rule.rule_data = JSON.parse(rule.rule_data);

      return rule;
    } catch (error) {
      this.logger.error('Failed to create content rule', {
        qrCodeId: ruleData.qr_code_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to create content rule', error);
    }
  }

  /**
   * Find content rule by ID
   */
  async findRuleById(ruleId: string): Promise<QRContentRule | null> {
    try {
      const query = 'SELECT * FROM qr_content_rules WHERE id = $1';
      const result = await this.db.query(query, [ruleId]);

      if (result.rows.length === 0) {
        return null;
      }

      const rule = result.rows[0];
      rule.rule_data = JSON.parse(rule.rule_data);

      return rule;
    } catch (error) {
      this.logger.error('Failed to find content rule', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to find content rule', error);
    }
  }

  /**
   * Find all content rules for a QR code
   */
  async findByQRCodeId(qrCodeId: string): Promise<QRContentRule[]> {
    try {
      const query = `
        SELECT * FROM qr_content_rules 
        WHERE qr_code_id = $1 
        ORDER BY priority DESC, created_at ASC
      `;
      const result = await this.db.query(query, [qrCodeId]);

      return result.rows.map(rule => ({
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      }));
    } catch (error) {
      this.logger.error('Failed to find content rules by QR code', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to find content rules', error);
    }
  }

  /**
   * Find active content rules for a QR code
   */
  async findActiveRulesByQRCodeId(qrCodeId: string): Promise<QRContentRule[]> {
    try {
      const query = `
        SELECT * FROM qr_content_rules 
        WHERE qr_code_id = $1 AND is_active = true
        ORDER BY priority DESC, created_at ASC
      `;
      const result = await this.db.query(query, [qrCodeId]);

      return result.rows.map(rule => ({
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      }));
    } catch (error) {
      this.logger.error('Failed to find active content rules', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to find active content rules', error);
    }
  }

  /**
   * Update a content rule
   */
  async updateRule(
    ruleId: string, 
    updateData: Partial<{
      rule_name: string;
      rule_type: string;
      rule_data: any;
      content_type: string;
      content_value: string;
      priority: number;
      is_active: boolean;
    }>
  ): Promise<QRContentRule | null> {
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(key === 'rule_data' ? JSON.stringify(value) : value);
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(ruleId);

      const query = `
        UPDATE qr_content_rules 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      this.logger.debug('Updating content rule', { ruleId, updateFields: Object.keys(updateData) });

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const rule = result.rows[0];
      rule.rule_data = JSON.parse(rule.rule_data);

      return rule;
    } catch (error) {
      this.logger.error('Failed to update content rule', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to update content rule', error);
    }
  }

  /**
   * Delete a content rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM qr_content_rules WHERE id = $1';
      const result = await this.db.query(query, [ruleId]);

      this.logger.info('Content rule deleted', { ruleId, deletedRows: result.rowCount });

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      this.logger.error('Failed to delete content rule', {
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to delete content rule', error);
    }
  }

  /**
   * Count rules for a QR code (for subscription limit checking)
   */
  async countRulesByQRCodeId(qrCodeId: string): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM qr_content_rules WHERE qr_code_id = $1';
      const result = await this.db.query(query, [qrCodeId]);

      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Failed to count content rules', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to count content rules', error);
    }
  }

  /**
   * Get rules statistics for analytics
   */
  async getRuleStats(qrCodeId?: string): Promise<{
    totalRules: number;
    rulesByType: Record<string, number>;
    activeRules: number;
  }> {
    try {
      let query: string;
      let values: any[];

      if (qrCodeId) {
        query = `
          SELECT 
            COUNT(*) as total_rules,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_rules,
            rule_type,
            COUNT(*) as type_count
          FROM qr_content_rules 
          WHERE qr_code_id = $1
          GROUP BY rule_type
        `;
        values = [qrCodeId];
      } else {
        query = `
          SELECT 
            COUNT(*) as total_rules,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_rules,
            rule_type,
            COUNT(*) as type_count
          FROM qr_content_rules 
          GROUP BY rule_type
        `;
        values = [];
      }

      const result = await this.db.query(query, values);

      const stats = {
        totalRules: 0,
        activeRules: 0,
        rulesByType: {} as Record<string, number>
      };

      for (const row of result.rows) {
        stats.totalRules += parseInt(row.type_count);
        stats.activeRules += parseInt(row.active_rules);
        stats.rulesByType[row.rule_type] = parseInt(row.type_count);
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get rule stats', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to get rule stats', error);
    }
  }

  /**
   * Delete all rules for a QR code (useful when QR is deleted)
   */
  async deleteRulesByQRCodeId(qrCodeId: string): Promise<number> {
    try {
      const query = 'DELETE FROM qr_content_rules WHERE qr_code_id = $1';
      const result = await this.db.query(query, [qrCodeId]);

      this.logger.info('All content rules deleted for QR code', { 
        qrCodeId, 
        deletedCount: result.rowCount 
      });

      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Failed to delete rules by QR code', {
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to delete rules by QR code', error);
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRuleStatus(ruleId: string, isActive: boolean): Promise<QRContentRule | null> {
    try {
      const query = `
        UPDATE qr_content_rules 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [isActive, ruleId]);

      if (result.rows.length === 0) {
        return null;
      }

      const rule = result.rows[0];
      rule.rule_data = JSON.parse(rule.rule_data);

      this.logger.info('Rule status toggled', { ruleId, isActive });

      return rule;
    } catch (error) {
      this.logger.error('Failed to toggle rule status', {
        ruleId,
        isActive,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to toggle rule status', error);
    }
  }

  /**
   * Find rules by type (useful for analytics)
   */
  async findRulesByType(ruleType: string): Promise<QRContentRule[]> {
    try {
      const query = `
        SELECT * FROM qr_content_rules 
        WHERE rule_type = $1 AND is_active = true
        ORDER BY priority DESC, created_at ASC
      `;
      const result = await this.db.query(query, [ruleType]);

      return result.rows.map(rule => ({
        ...rule,
        rule_data: JSON.parse(rule.rule_data)
      }));
    } catch (error) {
      this.logger.error('Failed to find rules by type', {
        ruleType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new DatabaseError('Failed to find rules by type', error);
    }
  }
}