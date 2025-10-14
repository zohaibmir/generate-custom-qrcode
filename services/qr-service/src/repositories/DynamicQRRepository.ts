import { Pool } from 'pg';
import {
  QRContentVersion,
  QRABTest,
  QRRedirectRule,
  QRContentSchedule,
  QRDynamicAnalytics,
  DynamicQRStats,
  IDynamicQRRepository,
  DatabaseError
} from '../interfaces';

export class DynamicQRRepository implements IDynamicQRRepository {
  constructor(private db: Pool) {}

  // ===============================================
  // CONTENT VERSION OPERATIONS
  // ===============================================

  async createContentVersion(versionData: {
    qrCodeId: string;
    content: any;
    redirectUrl?: string;
    isActive?: boolean;
    scheduledAt?: string;
    createdBy?: string;
  }): Promise<QRContentVersion> {
    try {
      const query = `
        INSERT INTO qr_content_versions (
          qr_code_id, version_number, content, redirect_url, 
          is_active, scheduled_at, created_by
        ) VALUES (
          $1, 
          (SELECT COALESCE(MAX(version_number), 0) + 1 FROM qr_content_versions WHERE qr_code_id = $1),
          $2, $3, $4, $5, $6
        )
        RETURNING *
      `;

      const values = [
        versionData.qrCodeId,
        versionData.content,
        versionData.redirectUrl,
        versionData.isActive || false,
        versionData.scheduledAt,
        versionData.createdBy
      ];

      const result = await this.db.query(query, values);
      return this.mapContentVersion(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to create content version', error);
    }
  }

  async findContentVersionById(versionId: string): Promise<QRContentVersion | null> {
    try {
      const query = `
        SELECT * FROM qr_content_versions 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [versionId]);
      return result.rows[0] ? this.mapContentVersion(result.rows[0]) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find content version', error);
    }
  }

  async findContentVersionsByQRCode(qrCodeId: string): Promise<QRContentVersion[]> {
    try {
      const query = `
        SELECT * FROM qr_content_versions 
        WHERE qr_code_id = $1 AND deleted_at IS NULL
        ORDER BY version_number DESC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      return result.rows.map(row => this.mapContentVersion(row));
    } catch (error) {
      throw new DatabaseError('Failed to find content versions', error);
    }
  }

  async getActiveContentVersion(qrCodeId: string): Promise<QRContentVersion | null> {
    try {
      const query = `
        SELECT * FROM qr_content_versions 
        WHERE qr_code_id = $1 AND is_active = true AND deleted_at IS NULL
        ORDER BY activated_at DESC, created_at DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      return result.rows[0] ? this.mapContentVersion(result.rows[0]) : null;
    } catch (error) {
      throw new DatabaseError('Failed to get active content version', error);
    }
  }

  async updateContentVersion(
    versionId: string, 
    versionData: Partial<{
      content: any;
      redirectUrl: string;
      isActive: boolean;
      scheduledAt: string;
    }>
  ): Promise<QRContentVersion> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (versionData.content !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        values.push(versionData.content);
      }
      if (versionData.redirectUrl !== undefined) {
        fields.push(`redirect_url = $${paramIndex++}`);
        values.push(versionData.redirectUrl);
      }
      if (versionData.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}, ${versionData.isActive ? 'activated_at = NOW()' : 'deactivated_at = NOW()'}`);
        values.push(versionData.isActive);
      }
      if (versionData.scheduledAt !== undefined) {
        fields.push(`scheduled_at = $${paramIndex++}`);
        values.push(versionData.scheduledAt);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(versionId);

      const query = `
        UPDATE qr_content_versions 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Content version not found');
      }

      return this.mapContentVersion(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to update content version', error);
    }
  }

  async deleteContentVersion(versionId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE qr_content_versions 
        SET deleted_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;
      
      const result = await this.db.query(query, [versionId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete content version', error);
    }
  }

  // ===============================================
  // A/B TEST OPERATIONS
  // ===============================================

  async createABTest(testData: {
    qrCodeId: string;
    testName: string;
    description?: string;
    variantAVersionId: string;
    variantBVersionId: string;
    trafficSplit?: number;
    startDate: string;
    endDate?: string;
  }): Promise<QRABTest> {
    try {
      const query = `
        INSERT INTO qr_ab_tests (
          qr_code_id, test_name, description, variant_a_version_id, 
          variant_b_version_id, traffic_split, start_date, end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        testData.qrCodeId,
        testData.testName,
        testData.description,
        testData.variantAVersionId,
        testData.variantBVersionId,
        testData.trafficSplit || 50,
        testData.startDate,
        testData.endDate
      ];

      const result = await this.db.query(query, values);
      return this.mapABTest(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to create A/B test', error);
    }
  }

  async findABTestById(testId: string): Promise<QRABTest | null> {
    try {
      const query = `
        SELECT * FROM qr_ab_tests 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [testId]);
      return result.rows[0] ? this.mapABTest(result.rows[0]) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find A/B test', error);
    }
  }

  async findABTestsByQRCode(qrCodeId: string): Promise<QRABTest[]> {
    try {
      const query = `
        SELECT * FROM qr_ab_tests 
        WHERE qr_code_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      return result.rows.map(row => this.mapABTest(row));
    } catch (error) {
      throw new DatabaseError('Failed to find A/B tests', error);
    }
  }

  async updateABTest(
    testId: string, 
    testData: Partial<{
      testName: string;
      description: string;
      trafficSplit: number;
      startDate: string;
      endDate: string;
      status: 'draft' | 'running' | 'paused' | 'completed';
      winnerVariant: 'A' | 'B';
    }>
  ): Promise<QRABTest> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(testData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          fields.push(`${dbField} = $${paramIndex++}`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(testId);

      const query = `
        UPDATE qr_ab_tests 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('A/B test not found');
      }

      return this.mapABTest(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to update A/B test', error);
    }
  }

  async deleteABTest(testId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE qr_ab_tests 
        SET deleted_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;
      
      const result = await this.db.query(query, [testId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete A/B test', error);
    }
  }

  // ===============================================
  // REDIRECT RULE OPERATIONS
  // ===============================================

  async createRedirectRule(ruleData: {
    qrCodeId: string;
    ruleName: string;
    ruleType: 'geographic' | 'device' | 'time' | 'custom';
    conditions: any;
    targetVersionId: string;
    priority?: number;
    isEnabled?: boolean;
  }): Promise<QRRedirectRule> {
    try {
      const query = `
        INSERT INTO qr_redirect_rules (
          qr_code_id, rule_name, rule_type, conditions, 
          target_version_id, priority, is_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        ruleData.qrCodeId,
        ruleData.ruleName,
        ruleData.ruleType,
        ruleData.conditions,
        ruleData.targetVersionId,
        ruleData.priority || 1,
        ruleData.isEnabled !== false
      ];

      const result = await this.db.query(query, values);
      return this.mapRedirectRule(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to create redirect rule', error);
    }
  }

  async findRedirectRuleById(ruleId: string): Promise<QRRedirectRule | null> {
    try {
      const query = `
        SELECT * FROM qr_redirect_rules 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [ruleId]);
      return result.rows[0] ? this.mapRedirectRule(result.rows[0]) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find redirect rule', error);
    }
  }

  async findRedirectRulesByQRCode(qrCodeId: string): Promise<QRRedirectRule[]> {
    try {
      const query = `
        SELECT * FROM qr_redirect_rules 
        WHERE qr_code_id = $1 AND deleted_at IS NULL
        ORDER BY priority ASC, created_at ASC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      return result.rows.map(row => this.mapRedirectRule(row));
    } catch (error) {
      throw new DatabaseError('Failed to find redirect rules', error);
    }
  }

  async updateRedirectRule(
    ruleId: string, 
    ruleData: Partial<{
      ruleName: string;
      conditions: any;
      targetVersionId: string;
      priority: number;
      isEnabled: boolean;
    }>
  ): Promise<QRRedirectRule> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(ruleData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          fields.push(`${dbField} = $${paramIndex++}`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(ruleId);

      const query = `
        UPDATE qr_redirect_rules 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Redirect rule not found');
      }

      return this.mapRedirectRule(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to update redirect rule', error);
    }
  }

  async deleteRedirectRule(ruleId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE qr_redirect_rules 
        SET deleted_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;
      
      const result = await this.db.query(query, [ruleId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete redirect rule', error);
    }
  }

  // ===============================================
  // CONTENT SCHEDULE OPERATIONS
  // ===============================================

  async createContentSchedule(scheduleData: {
    qrCodeId: string;
    versionId: string;
    scheduleName: string;
    startTime: string;
    endTime?: string;
    repeatPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
    repeatDays?: number[];
    timezone?: string;
    isActive?: boolean;
  }): Promise<QRContentSchedule> {
    try {
      const query = `
        INSERT INTO qr_content_schedule (
          qr_code_id, version_id, schedule_name, start_time, 
          end_time, repeat_pattern, repeat_days, timezone, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        scheduleData.qrCodeId,
        scheduleData.versionId,
        scheduleData.scheduleName,
        scheduleData.startTime,
        scheduleData.endTime,
        scheduleData.repeatPattern || 'none',
        scheduleData.repeatDays ? JSON.stringify(scheduleData.repeatDays) : null,
        scheduleData.timezone || 'UTC',
        scheduleData.isActive !== false
      ];

      const result = await this.db.query(query, values);
      return this.mapContentSchedule(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to create content schedule', error);
    }
  }

  async findContentScheduleById(scheduleId: string): Promise<QRContentSchedule | null> {
    try {
      const query = `
        SELECT * FROM qr_content_schedule 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [scheduleId]);
      return result.rows[0] ? this.mapContentSchedule(result.rows[0]) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find content schedule', error);
    }
  }

  async findContentSchedulesByQRCode(qrCodeId: string): Promise<QRContentSchedule[]> {
    try {
      const query = `
        SELECT * FROM qr_content_schedule 
        WHERE qr_code_id = $1 AND deleted_at IS NULL
        ORDER BY start_time ASC
      `;
      
      const result = await this.db.query(query, [qrCodeId]);
      return result.rows.map(row => this.mapContentSchedule(row));
    } catch (error) {
      throw new DatabaseError('Failed to find content schedules', error);
    }
  }

  async updateContentSchedule(
    scheduleId: string, 
    scheduleData: Partial<{
      scheduleName: string;
      startTime: string;
      endTime: string;
      repeatPattern: 'none' | 'daily' | 'weekly' | 'monthly';
      repeatDays: number[];
      timezone: string;
      isActive: boolean;
    }>
  ): Promise<QRContentSchedule> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(scheduleData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (key === 'repeatDays') {
            fields.push(`repeat_days = $${paramIndex++}`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${dbField} = $${paramIndex++}`);
            values.push(value);
          }
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(scheduleId);

      const query = `
        UPDATE qr_content_schedule 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Content schedule not found');
      }

      return this.mapContentSchedule(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to update content schedule', error);
    }
  }

  async deleteContentSchedule(scheduleId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE qr_content_schedule 
        SET deleted_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;
      
      const result = await this.db.query(query, [scheduleId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete content schedule', error);
    }
  }

  // ===============================================
  // ANALYTICS OPERATIONS
  // ===============================================

  async recordDynamicAnalytics(analyticsData: {
    qrCodeId: string;
    versionId?: string;
    abTestId?: string;
    variant?: 'A' | 'B';
    redirectRuleId?: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    region?: string;
    city?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    referrer?: string;
    conversionEvent?: string;
    sessionId?: string;
  }): Promise<QRDynamicAnalytics> {
    try {
      const query = `
        INSERT INTO qr_dynamic_analytics (
          qr_code_id, version_id, ab_test_id, variant, redirect_rule_id,
          user_agent, ip_address, country, region, city, device_type,
          browser, os, referrer, conversion_event, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const values = [
        analyticsData.qrCodeId,
        analyticsData.versionId,
        analyticsData.abTestId,
        analyticsData.variant,
        analyticsData.redirectRuleId,
        analyticsData.userAgent,
        analyticsData.ipAddress,
        analyticsData.country,
        analyticsData.region,
        analyticsData.city,
        analyticsData.deviceType,
        analyticsData.browser,
        analyticsData.os,
        analyticsData.referrer,
        analyticsData.conversionEvent,
        analyticsData.sessionId
      ];

      const result = await this.db.query(query, values);
      return this.mapDynamicAnalytics(result.rows[0]);
    } catch (error) {
      throw new DatabaseError('Failed to record dynamic analytics', error);
    }
  }

  async getDynamicAnalytics(
    qrCodeId: string, 
    options?: {
      startDate?: string;
      endDate?: string;
      versionId?: string;
      abTestId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<QRDynamicAnalytics[]> {
    try {
      let query = `
        SELECT * FROM qr_dynamic_analytics 
        WHERE qr_code_id = $1
      `;
      const values: any[] = [qrCodeId];
      let paramIndex = 2;

      if (options?.startDate) {
        query += ` AND scan_timestamp >= $${paramIndex++}`;
        values.push(options.startDate);
      }
      if (options?.endDate) {
        query += ` AND scan_timestamp <= $${paramIndex++}`;
        values.push(options.endDate);
      }
      if (options?.versionId) {
        query += ` AND version_id = $${paramIndex++}`;
        values.push(options.versionId);
      }
      if (options?.abTestId) {
        query += ` AND ab_test_id = $${paramIndex++}`;
        values.push(options.abTestId);
      }

      query += ` ORDER BY scan_timestamp DESC`;

      if (options?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(options.limit);
      }
      if (options?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }

      const result = await this.db.query(query, values);
      return result.rows.map(row => this.mapDynamicAnalytics(row));
    } catch (error) {
      throw new DatabaseError('Failed to get dynamic analytics', error);
    }
  }

  async getDynamicQRStats(qrCodeId: string): Promise<DynamicQRStats> {
    try {
      // Get basic stats
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT v.id) as total_versions,
          v.version_number as active_version,
          COUNT(a.id) as total_scans,
          COUNT(DISTINCT CASE WHEN ab.status = 'running' THEN ab.id END) as ab_tests_running,
          COUNT(DISTINCT CASE WHEN r.is_enabled = true THEN r.id END) as redirect_rules_active,
          COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as scheduled_content
        FROM qr_content_versions v
        LEFT JOIN qr_dynamic_analytics a ON v.id = a.version_id
        LEFT JOIN qr_ab_tests ab ON v.qr_code_id = ab.qr_code_id AND ab.deleted_at IS NULL
        LEFT JOIN qr_redirect_rules r ON v.qr_code_id = r.qr_code_id AND r.deleted_at IS NULL
        LEFT JOIN qr_content_schedule s ON v.qr_code_id = s.qr_code_id AND s.deleted_at IS NULL
        WHERE v.qr_code_id = $1 AND v.deleted_at IS NULL AND v.is_active = true
        GROUP BY v.version_number
        ORDER BY v.version_number DESC
        LIMIT 1
      `;

      // Get version performance
      const performanceQuery = `
        SELECT 
          v.id as version_id,
          v.version_number,
          COUNT(a.id) as scans,
          COALESCE(
            COUNT(CASE WHEN a.conversion_event IS NOT NULL THEN 1 END) * 100.0 / 
            NULLIF(COUNT(a.id), 0), 0
          ) as conversion_rate
        FROM qr_content_versions v
        LEFT JOIN qr_dynamic_analytics a ON v.id = a.version_id
        WHERE v.qr_code_id = $1 AND v.deleted_at IS NULL
        GROUP BY v.id, v.version_number
        ORDER BY v.version_number DESC
      `;

      const [statsResult, performanceResult] = await Promise.all([
        this.db.query(statsQuery, [qrCodeId]),
        this.db.query(performanceQuery, [qrCodeId])
      ]);

      const stats = statsResult.rows[0] || {
        total_versions: 0,
        active_version: 1,
        total_scans: 0,
        ab_tests_running: 0,
        redirect_rules_active: 0,
        scheduled_content: 0
      };

      return {
        qrCodeId,
        totalVersions: parseInt(stats.total_versions),
        activeVersion: parseInt(stats.active_version),
        totalScans: parseInt(stats.total_scans),
        versionsPerformance: performanceResult.rows.map(row => ({
          versionId: row.version_id,
          versionNumber: parseInt(row.version_number),
          scans: parseInt(row.scans),
          conversionRate: parseFloat(row.conversion_rate)
        })),
        abTestsRunning: parseInt(stats.ab_tests_running),
        redirectRulesActive: parseInt(stats.redirect_rules_active),
        scheduledContent: parseInt(stats.scheduled_content)
      };
    } catch (error) {
      throw new DatabaseError('Failed to get dynamic QR stats', error);
    }
  }

  // ===============================================
  // MAPPING FUNCTIONS
  // ===============================================

  private mapContentVersion(row: any): QRContentVersion {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      versionNumber: row.version_number,
      content: row.content,
      redirectUrl: row.redirect_url,
      isActive: row.is_active,
      scheduledAt: row.scheduled_at,
      activatedAt: row.activated_at,
      deactivatedAt: row.deactivated_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapABTest(row: any): QRABTest {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      testName: row.test_name,
      description: row.description,
      variantAVersionId: row.variant_a_version_id,
      variantBVersionId: row.variant_b_version_id,
      trafficSplit: row.traffic_split,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      winnerVariant: row.winner_variant,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRedirectRule(row: any): QRRedirectRule {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      ruleName: row.rule_name,
      ruleType: row.rule_type,
      conditions: row.conditions,
      targetVersionId: row.target_version_id,
      priority: row.priority,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapContentSchedule(row: any): QRContentSchedule {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      versionId: row.version_id,
      scheduleName: row.schedule_name,
      startTime: row.start_time,
      endTime: row.end_time,
      repeatPattern: row.repeat_pattern,
      repeatDays: row.repeat_days ? JSON.parse(row.repeat_days) : null,
      timezone: row.timezone,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDynamicAnalytics(row: any): QRDynamicAnalytics {
    return {
      id: row.id,
      qrCodeId: row.qr_code_id,
      versionId: row.version_id,
      abTestId: row.ab_test_id,
      variant: row.variant,
      redirectRuleId: row.redirect_rule_id,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      country: row.country,
      region: row.region,
      city: row.city,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      referrer: row.referrer,
      conversionEvent: row.conversion_event,
      sessionId: row.session_id,
      scanTimestamp: row.scan_timestamp
    };
  }
}