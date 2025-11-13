import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    CampaignGroup,
    CampaignVariant,
    ABExperiment,
    CampaignPerformance,
    CohortAnalysis,
    AttributionModel,
    AttributionResult,
    FunnelStage,
    FunnelPerformance,
    StatisticalTest,
    CampaignComparison,
    CampaignRecommendation
} from '../services/cross-campaign-analysis.service';

export class CrossCampaignAnalysisRepository {
    constructor(private db: Pool) {}

    // Campaign Groups
    async createCampaignGroup(data: Omit<CampaignGroup, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignGroup> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO campaign_groups (
                    id, name, description, status, start_date, end_date, 
                    created_by, metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const values = [
                id, data.name, data.description, data.status,
                data.start_date, data.end_date, data.created_by,
                JSON.stringify(data.metadata), now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCampaignGroupById(id: string): Promise<CampaignGroup | null> {
        const query = 'SELECT * FROM campaign_groups WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getCampaignGroups(filters: {
        status?: string;
        created_by?: string;
        date_range?: { start: Date; end: Date };
        limit?: number;
        offset?: number;
    } = {}): Promise<{ groups: CampaignGroup[]; total: number }> {
        let query = 'SELECT * FROM campaign_groups WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM campaign_groups WHERE 1=1';
        const values: any[] = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            const condition = ` AND status = $${paramCount}`;
            query += condition;
            countQuery += condition;
            values.push(filters.status);
        }

        if (filters.created_by) {
            paramCount++;
            const condition = ` AND created_by = $${paramCount}`;
            query += condition;
            countQuery += condition;
            values.push(filters.created_by);
        }

        if (filters.date_range) {
            paramCount++;
            const startCondition = ` AND start_date >= $${paramCount}`;
            query += startCondition;
            countQuery += startCondition;
            values.push(filters.date_range.start);
            
            paramCount++;
            const endCondition = ` AND start_date <= $${paramCount}`;
            query += endCondition;
            countQuery += endCondition;
            values.push(filters.date_range.end);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
        }

        const [groupsResult, countResult] = await Promise.all([
            this.db.query(query, values),
            this.db.query(countQuery, values.slice(0, -2)) // Remove limit/offset from count query
        ]);

        return {
            groups: groupsResult.rows,
            total: parseInt(countResult.rows[0].total)
        };
    }

    async updateCampaignGroup(id: string, data: Partial<CampaignGroup>): Promise<CampaignGroup | null> {
        const client = await this.db.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 0;

            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && key !== 'id' && key !== 'created_at') {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    if (key === 'metadata') {
                        values.push(JSON.stringify(value));
                    } else {
                        values.push(value);
                    }
                }
            }

            if (fields.length === 0) {
                return await this.getCampaignGroupById(id);
            }

            paramCount++;
            fields.push(`updated_at = $${paramCount}`);
            values.push(new Date());

            paramCount++;
            values.push(id);

            const query = `
                UPDATE campaign_groups 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(query, values);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Campaign Variants
    async createCampaignVariant(data: Omit<CampaignVariant, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignVariant> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO campaign_variants (
                    id, campaign_group_id, name, description, traffic_allocation, 
                    configuration, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                id, data.campaign_group_id, data.name, data.description,
                data.traffic_allocation, JSON.stringify(data.configuration), now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getVariantsByCampaignGroup(campaignGroupId: string): Promise<CampaignVariant[]> {
        const query = 'SELECT * FROM campaign_variants WHERE campaign_group_id = $1 ORDER BY created_at';
        const result = await this.db.query(query, [campaignGroupId]);
        return result.rows;
    }

    // A/B Experiments
    async createABExperiment(data: Omit<ABExperiment, 'id' | 'created_at' | 'updated_at'>): Promise<ABExperiment> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO ab_experiments (
                    id, campaign_group_id, name, description, hypothesis, status,
                    start_date, end_date, sample_size_target, confidence_level,
                    expected_improvement, primary_metric, secondary_metrics,
                    created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `;

            const values = [
                id, data.campaign_group_id, data.name, data.description,
                data.hypothesis, data.status, data.start_date, data.end_date,
                data.sample_size_target, data.confidence_level, data.expected_improvement,
                data.primary_metric, JSON.stringify(data.secondary_metrics),
                data.created_by, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getABExperimentById(id: string): Promise<ABExperiment | null> {
        const query = 'SELECT * FROM ab_experiments WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getExperimentsByCampaignGroup(campaignGroupId: string): Promise<ABExperiment[]> {
        const query = `
            SELECT * FROM ab_experiments 
            WHERE campaign_group_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await this.db.query(query, [campaignGroupId]);
        return result.rows;
    }

    async updateABExperiment(id: string, data: Partial<ABExperiment>): Promise<ABExperiment | null> {
        const client = await this.db.connect();
        try {
            const fields = [];
            const values = [];
            let paramCount = 0;

            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && key !== 'id' && key !== 'created_at') {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    if (key === 'secondary_metrics') {
                        values.push(JSON.stringify(value));
                    } else {
                        values.push(value);
                    }
                }
            }

            if (fields.length === 0) {
                return await this.getABExperimentById(id);
            }

            paramCount++;
            fields.push(`updated_at = $${paramCount}`);
            values.push(new Date());

            paramCount++;
            values.push(id);

            const query = `
                UPDATE ab_experiments 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(query, values);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Campaign Performance
    async createCampaignPerformance(data: Omit<CampaignPerformance, 'id' | 'created_at'>): Promise<CampaignPerformance> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO campaign_performance (
                    id, campaign_id, campaign_group_id, variant_id, date,
                    impressions, clicks, conversions, revenue, cost,
                    unique_visitors, bounce_rate, avg_session_duration, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `;

            const values = [
                id, data.campaign_id, data.campaign_group_id, data.variant_id,
                data.date, data.impressions, data.clicks, data.conversions,
                data.revenue, data.cost, data.unique_visitors,
                data.bounce_rate, data.avg_session_duration, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCampaignPerformance(filters: {
        campaign_id?: string;
        campaign_group_id?: string;
        variant_id?: string;
        date_range?: { start: Date; end: Date };
        metrics?: string[];
    }): Promise<CampaignPerformance[]> {
        const selectFields = filters.metrics?.length 
            ? ['id', 'campaign_id', 'variant_id', 'date', ...filters.metrics]
            : ['*'];

        let query = `SELECT ${selectFields.join(', ')} FROM campaign_performance WHERE 1=1`;
        const values: any[] = [];
        let paramCount = 0;

        if (filters.campaign_id) {
            paramCount++;
            query += ` AND campaign_id = $${paramCount}`;
            values.push(filters.campaign_id);
        }

        if (filters.campaign_group_id) {
            paramCount++;
            query += ` AND campaign_group_id = $${paramCount}`;
            values.push(filters.campaign_group_id);
        }

        if (filters.variant_id) {
            paramCount++;
            query += ` AND variant_id = $${paramCount}`;
            values.push(filters.variant_id);
        }

        if (filters.date_range) {
            paramCount++;
            query += ` AND date >= $${paramCount}`;
            values.push(filters.date_range.start);
            
            paramCount++;
            query += ` AND date <= $${paramCount}`;
            values.push(filters.date_range.end);
        }

        query += ' ORDER BY date DESC';

        const result = await this.db.query(query, values);
        return result.rows;
    }

    // Attribution Models
    async createAttributionModel(data: Omit<AttributionModel, 'id' | 'created_at' | 'updated_at'>): Promise<AttributionModel> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO attribution_models (
                    id, name, type, configuration, description, is_default, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                id, data.name, data.type, JSON.stringify(data.configuration),
                data.description, data.is_default, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getAttributionModels(): Promise<AttributionModel[]> {
        const query = 'SELECT * FROM attribution_models ORDER BY created_at DESC';
        const result = await this.db.query(query);
        return result.rows;
    }

    async getAttributionModelById(id: string): Promise<AttributionModel | null> {
        const query = 'SELECT * FROM attribution_models WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }

    // Attribution Results
    async createAttributionResult(data: Omit<AttributionResult, 'id' | 'created_at'>): Promise<AttributionResult> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO attribution_results (
                    id, campaign_id, attribution_model_id, user_id, conversion_id,
                    touchpoint_sequence, attribution_weight, revenue_attributed,
                    conversion_date, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const values = [
                id, data.campaign_id, data.attribution_model_id, data.user_id,
                data.conversion_id, JSON.stringify(data.touchpoint_sequence),
                data.attribution_weight, data.revenue_attributed,
                data.conversion_date, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getAttributionResults(filters: {
        campaign_id?: string;
        attribution_model_id?: string;
        date_range?: { start: Date; end: Date };
        limit?: number;
        offset?: number;
    }): Promise<{ results: AttributionResult[]; total: number }> {
        let query = 'SELECT * FROM attribution_results WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM attribution_results WHERE 1=1';
        const values: any[] = [];
        let paramCount = 0;

        if (filters.campaign_id) {
            paramCount++;
            const condition = ` AND campaign_id = $${paramCount}`;
            query += condition;
            countQuery += condition;
            values.push(filters.campaign_id);
        }

        if (filters.attribution_model_id) {
            paramCount++;
            const condition = ` AND attribution_model_id = $${paramCount}`;
            query += condition;
            countQuery += condition;
            values.push(filters.attribution_model_id);
        }

        if (filters.date_range) {
            paramCount++;
            const startCondition = ` AND conversion_date >= $${paramCount}`;
            query += startCondition;
            countQuery += startCondition;
            values.push(filters.date_range.start);
            
            paramCount++;
            const endCondition = ` AND conversion_date <= $${paramCount}`;
            query += endCondition;
            countQuery += endCondition;
            values.push(filters.date_range.end);
        }

        query += ' ORDER BY conversion_date DESC';

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
        }

        const [resultsResult, countResult] = await Promise.all([
            this.db.query(query, values),
            this.db.query(countQuery, values.slice(0, -2)) // Remove limit/offset from count query
        ]);

        return {
            results: resultsResult.rows,
            total: parseInt(countResult.rows[0].total)
        };
    }

    // Statistical Tests
    async createStatisticalTest(data: Omit<StatisticalTest, 'id' | 'created_at'>): Promise<StatisticalTest> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO statistical_tests (
                    id, experiment_id, test_type, control_group_id, test_group_id,
                    metric_name, control_value, test_value, sample_size_control,
                    sample_size_test, p_value, confidence_interval_lower,
                    confidence_interval_upper, effect_size, statistical_power,
                    is_significant, test_results, calculated_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING *
            `;

            const values = [
                id, data.experiment_id, data.test_type, data.control_group_id,
                data.test_group_id, data.metric_name, data.control_value,
                data.test_value, data.sample_size_control, data.sample_size_test,
                data.p_value, data.confidence_interval_lower, data.confidence_interval_upper,
                data.effect_size, data.statistical_power, data.is_significant,
                JSON.stringify(data.test_results), data.calculated_at, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getStatisticalTestsByExperiment(experimentId: string): Promise<StatisticalTest[]> {
        const query = `
            SELECT * FROM statistical_tests 
            WHERE experiment_id = $1 
            ORDER BY calculated_at DESC
        `;
        const result = await this.db.query(query, [experimentId]);
        return result.rows;
    }

    // Cohort Analysis
    async createCohortAnalysis(data: Omit<CohortAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<CohortAnalysis> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO cohort_analysis (
                    id, campaign_group_id, cohort_date, cohort_size, day_0_retention,
                    day_1_retention, day_7_retention, day_30_retention, day_90_retention,
                    lifetime_value, avg_revenue_per_user, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (campaign_group_id, cohort_date) DO UPDATE SET
                    cohort_size = EXCLUDED.cohort_size,
                    day_0_retention = EXCLUDED.day_0_retention,
                    day_1_retention = EXCLUDED.day_1_retention,
                    day_7_retention = EXCLUDED.day_7_retention,
                    day_30_retention = EXCLUDED.day_30_retention,
                    day_90_retention = EXCLUDED.day_90_retention,
                    lifetime_value = EXCLUDED.lifetime_value,
                    avg_revenue_per_user = EXCLUDED.avg_revenue_per_user,
                    updated_at = EXCLUDED.updated_at
                RETURNING *
            `;

            const values = [
                id, data.campaign_group_id, data.cohort_date, data.cohort_size,
                data.day_0_retention, data.day_1_retention, data.day_7_retention,
                data.day_30_retention, data.day_90_retention, data.lifetime_value,
                data.avg_revenue_per_user, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCohortAnalysisByCampaignGroup(
        campaignGroupId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<CohortAnalysis[]> {
        let query = `
            SELECT * FROM cohort_analysis 
            WHERE campaign_group_id = $1
        `;
        const values = [campaignGroupId];

        if (dateRange) {
            query += ' AND cohort_date BETWEEN $2 AND $3';
            values.push(dateRange.start.toISOString(), dateRange.end.toISOString());
        }

        query += ' ORDER BY cohort_date DESC';

        const result = await this.db.query(query, values);
        return result.rows;
    }

    // Funnel Stages & Performance
    async createFunnelStage(data: Omit<FunnelStage, 'id' | 'created_at' | 'updated_at'>): Promise<FunnelStage> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO funnel_stages (
                    id, campaign_group_id, stage_name, stage_order, event_name,
                    description, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                id, data.campaign_group_id, data.stage_name, data.stage_order,
                data.event_name, data.description, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getFunnelStagesByCampaignGroup(campaignGroupId: string): Promise<FunnelStage[]> {
        const query = `
            SELECT * FROM funnel_stages 
            WHERE campaign_group_id = $1 
            ORDER BY stage_order
        `;
        const result = await this.db.query(query, [campaignGroupId]);
        return result.rows;
    }

    async createFunnelPerformance(data: Omit<FunnelPerformance, 'id' | 'created_at'>): Promise<FunnelPerformance> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO funnel_performance (
                    id, funnel_stage_id, campaign_id, variant_id, date,
                    entries, exits, conversion_rate, avg_time_to_next_stage, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const values = [
                id, data.funnel_stage_id, data.campaign_id, data.variant_id,
                data.date, data.entries, data.exits, data.conversion_rate,
                data.avg_time_to_next_stage, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getFunnelPerformance(filters: {
        campaign_group_id?: string;
        campaign_id?: string;
        date_range?: { start: Date; end: Date };
    }): Promise<FunnelPerformance[]> {
        let query = `
            SELECT fp.*, fs.stage_name, fs.stage_order 
            FROM funnel_performance fp
            JOIN funnel_stages fs ON fp.funnel_stage_id = fs.id
            WHERE 1=1
        `;
        const values: any[] = [];
        let paramCount = 0;

        if (filters.campaign_group_id) {
            paramCount++;
            query += ` AND fs.campaign_group_id = $${paramCount}`;
            values.push(filters.campaign_group_id);
        }

        if (filters.campaign_id) {
            paramCount++;
            query += ` AND fp.campaign_id = $${paramCount}`;
            values.push(filters.campaign_id);
        }

        if (filters.date_range) {
            paramCount++;
            query += ` AND fp.date >= $${paramCount}`;
            values.push(filters.date_range.start);
            
            paramCount++;
            query += ` AND fp.date <= $${paramCount}`;
            values.push(filters.date_range.end);
        }

        query += ' ORDER BY fs.stage_order, fp.date';

        const result = await this.db.query(query, values);
        return result.rows;
    }

    // Campaign Comparisons
    async createCampaignComparison(data: Omit<CampaignComparison, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignComparison> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO campaign_comparisons (
                    id, primary_campaign_id, comparison_campaign_id, comparison_type,
                    metric_comparisons, significance_results, insights, created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const values = [
                id, data.primary_campaign_id, data.comparison_campaign_id,
                data.comparison_type, JSON.stringify(data.metric_comparisons),
                JSON.stringify(data.significance_results), JSON.stringify(data.insights),
                data.created_by, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCampaignComparisons(campaignId: string): Promise<CampaignComparison[]> {
        const query = `
            SELECT * FROM campaign_comparisons 
            WHERE primary_campaign_id = $1 OR comparison_campaign_id = $1
            ORDER BY created_at DESC
        `;
        const result = await this.db.query(query, [campaignId]);
        return result.rows;
    }

    // Campaign Recommendations
    async createCampaignRecommendation(data: Omit<CampaignRecommendation, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignRecommendation> {
        const client = await this.db.connect();
        try {
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO campaign_recommendations (
                    id, campaign_group_id, campaign_id, recommendation_type, title,
                    description, priority, impact_score, confidence_level, supporting_data,
                    implementation_effort, status, created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;

            const values = [
                id, data.campaign_group_id, data.campaign_id, data.recommendation_type,
                data.title, data.description, data.priority, data.impact_score,
                data.confidence_level, JSON.stringify(data.supporting_data),
                data.implementation_effort, data.status, data.created_by, now, now
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getRecommendationsByCampaignGroup(
        campaignGroupId: string,
        status?: string
    ): Promise<CampaignRecommendation[]> {
        let query = `
            SELECT * FROM campaign_recommendations 
            WHERE campaign_group_id = $1
        `;
        const values = [campaignGroupId];

        if (status) {
            query += ' AND status = $2';
            values.push(status);
        }

        query += ' ORDER BY impact_score DESC, priority DESC, created_at DESC';

        const result = await this.db.query(query, values);
        return result.rows;
    }

    async updateRecommendationStatus(
        id: string, 
        status: string
    ): Promise<CampaignRecommendation | null> {
        const client = await this.db.connect();
        try {
            const query = `
                UPDATE campaign_recommendations 
                SET status = $1, updated_at = $2
                WHERE id = $3
                RETURNING *
            `;

            const values = [status, new Date(), id];
            const result = await client.query(query, values);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Bulk Operations
    async bulkCreateCampaignPerformance(performances: Omit<CampaignPerformance, 'id' | 'created_at'>[]): Promise<CampaignPerformance[]> {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');

            const results: CampaignPerformance[] = [];

            for (const performance of performances) {
                const id = uuidv4();
                const now = new Date();

                const query = `
                    INSERT INTO campaign_performance (
                        id, campaign_id, campaign_group_id, variant_id, date,
                        impressions, clicks, conversions, revenue, cost,
                        unique_visitors, bounce_rate, avg_session_duration, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *
                `;

                const values = [
                    id, performance.campaign_id, performance.campaign_group_id, performance.variant_id,
                    performance.date, performance.impressions, performance.clicks, performance.conversions,
                    performance.revenue, performance.cost, performance.unique_visitors,
                    performance.bounce_rate, performance.avg_session_duration, now
                ];

                const result = await client.query(query, values);
                results.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}