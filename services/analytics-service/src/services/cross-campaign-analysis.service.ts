import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignGroup {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'paused' | 'completed';
    start_date: Date;
    end_date?: Date;
    created_by: string;
    metadata?: any;
    created_at: Date;
    updated_at: Date;
}

export interface CampaignVariant {
    id: string;
    campaign_group_id: string;
    name: string;
    description?: string;
    traffic_allocation: number;
    configuration: any;
    created_at: Date;
    updated_at: Date;
}

export interface ABExperiment {
    id: string;
    campaign_group_id: string;
    name: string;
    description?: string;
    hypothesis: string;
    status: 'draft' | 'running' | 'paused' | 'completed';
    start_date: Date;
    end_date?: Date;
    sample_size_target?: number;
    confidence_level: number;
    expected_improvement: number;
    primary_metric: string;
    secondary_metrics?: string[];
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export interface CampaignPerformance {
    id: string;
    campaign_id: string;
    campaign_group_id: string;
    variant_id?: string;
    date: Date;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue?: number;
    cost?: number;
    unique_visitors: number;
    bounce_rate?: number;
    avg_session_duration?: number;
    created_at: Date;
}

export interface CohortAnalysis {
    id: string;
    campaign_group_id: string;
    cohort_date: Date;
    cohort_size: number;
    day_0_retention: number;
    day_1_retention: number;
    day_7_retention: number;
    day_30_retention: number;
    day_90_retention: number;
    lifetime_value?: number;
    avg_revenue_per_user?: number;
    created_at: Date;
    updated_at: Date;
}

export interface AttributionModel {
    id: string;
    name: string;
    type: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'data_driven';
    configuration: any;
    description?: string;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface AttributionResult {
    id: string;
    campaign_id: string;
    attribution_model_id: string;
    user_id: string;
    conversion_id: string;
    touchpoint_sequence: any;
    attribution_weight: number;
    revenue_attributed?: number;
    conversion_date: Date;
    created_at: Date;
}

export interface FunnelStage {
    id: string;
    campaign_group_id: string;
    stage_name: string;
    stage_order: number;
    event_name: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export interface FunnelPerformance {
    id: string;
    funnel_stage_id: string;
    campaign_id: string;
    variant_id?: string;
    date: Date;
    entries: number;
    exits: number;
    conversion_rate: number;
    avg_time_to_next_stage?: number;
    created_at: Date;
}

export interface StatisticalTest {
    id: string;
    experiment_id: string;
    test_type: 'ttest' | 'chi_square' | 'mann_whitney' | 'bayesian' | 'anova';
    control_group_id: string;
    test_group_id: string;
    metric_name: string;
    control_value: number;
    test_value: number;
    sample_size_control: number;
    sample_size_test: number;
    p_value?: number;
    confidence_interval_lower?: number;
    confidence_interval_upper?: number;
    effect_size?: number;
    statistical_power?: number;
    is_significant: boolean;
    test_results: any;
    calculated_at: Date;
    created_at: Date;
}

export interface CampaignComparison {
    id: string;
    primary_campaign_id: string;
    comparison_campaign_id: string;
    comparison_type: 'period_over_period' | 'variant_comparison' | 'cross_campaign';
    metric_comparisons: any;
    significance_results: any;
    insights: string[];
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export interface CampaignRecommendation {
    id: string;
    campaign_group_id: string;
    campaign_id?: string;
    recommendation_type: 'optimization' | 'budget_allocation' | 'audience_expansion' | 'creative_iteration';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact_score: number;
    confidence_level: number;
    supporting_data: any;
    implementation_effort: 'low' | 'medium' | 'high';
    status: 'pending' | 'implemented' | 'dismissed';
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export class CrossCampaignAnalysisService {
    constructor(private db: Pool) {}

    // Campaign Group Management
    async createCampaignGroup(data: Omit<CampaignGroup, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignGroup> {
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO campaign_groups (
                id, name, description, status, start_date, end_date, created_by, metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            id, data.name, data.description, data.status, data.start_date, 
            data.end_date, data.created_by, JSON.stringify(data.metadata), now, now
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    async getCampaignGroups(filters: {
        status?: string;
        created_by?: string;
        date_range?: { start: Date; end: Date };
    } = {}): Promise<CampaignGroup[]> {
        let query = 'SELECT * FROM campaign_groups WHERE 1=1';
        const values: any[] = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.created_by) {
            paramCount++;
            query += ` AND created_by = $${paramCount}`;
            values.push(filters.created_by);
        }

        if (filters.date_range) {
            paramCount++;
            query += ` AND start_date >= $${paramCount}`;
            values.push(filters.date_range.start);
            
            paramCount++;
            query += ` AND start_date <= $${paramCount}`;
            values.push(filters.date_range.end);
        }

        query += ' ORDER BY created_at DESC';

        const result = await this.db.query(query, values);
        return result.rows;
    }

    // A/B Testing
    async createABExperiment(data: Omit<ABExperiment, 'id' | 'created_at' | 'updated_at'>): Promise<ABExperiment> {
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO ab_experiments (
                id, campaign_group_id, name, description, hypothesis, status, start_date, end_date,
                sample_size_target, confidence_level, expected_improvement, primary_metric,
                secondary_metrics, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const values = [
            id, data.campaign_group_id, data.name, data.description, data.hypothesis,
            data.status, data.start_date, data.end_date, data.sample_size_target,
            data.confidence_level, data.expected_improvement, data.primary_metric,
            JSON.stringify(data.secondary_metrics), data.created_by, now, now
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    async getABExperimentResults(experimentId: string): Promise<{
        experiment: ABExperiment;
        variants: CampaignVariant[];
        performance: CampaignPerformance[];
        statisticalTests: StatisticalTest[];
        significance: boolean;
        winner?: string;
        insights: string[];
    }> {
        // Get experiment details
        const experimentQuery = 'SELECT * FROM ab_experiments WHERE id = $1';
        const experimentResult = await this.db.query(experimentQuery, [experimentId]);
        const experiment = experimentResult.rows[0];

        if (!experiment) {
            throw new Error('Experiment not found');
        }

        // Get variants
        const variantsQuery = 'SELECT * FROM campaign_variants WHERE campaign_group_id = $1';
        const variantsResult = await this.db.query(variantsQuery, [experiment.campaign_group_id]);
        const variants = variantsResult.rows;

        // Get performance data
        const performanceQuery = `
            SELECT * FROM campaign_performance 
            WHERE campaign_group_id = $1 
            AND date BETWEEN $2 AND $3
            ORDER BY date
        `;
        const performanceResult = await this.db.query(performanceQuery, [
            experiment.campaign_group_id,
            experiment.start_date,
            experiment.end_date || new Date()
        ]);
        const performance = performanceResult.rows;

        // Get statistical tests
        const testsQuery = 'SELECT * FROM statistical_tests WHERE experiment_id = $1';
        const testsResult = await this.db.query(testsQuery, [experimentId]);
        const statisticalTests = testsResult.rows;

        // Calculate significance and winner
        const significance = statisticalTests.some(test => test.is_significant);
        const winner = this.determineWinner(performance, variants);

        // Generate insights
        const insights = this.generateABTestInsights(experiment, performance, statisticalTests);

        return {
            experiment,
            variants,
            performance,
            statisticalTests,
            significance,
            winner,
            insights
        };
    }

    // Statistical Testing
    async performStatisticalTest(data: {
        experimentId: string;
        testType: string;
        controlGroupId: string;
        testGroupId: string;
        metricName: string;
    }): Promise<StatisticalTest> {
        const id = uuidv4();
        const now = new Date();

        // Get performance data for both groups
        const controlData = await this.getGroupPerformanceData(data.controlGroupId, data.metricName);
        const testData = await this.getGroupPerformanceData(data.testGroupId, data.metricName);

        // Perform statistical test based on type
        const testResults = await this.runStatisticalTest(
            data.testType,
            controlData.values,
            testData.values,
            data.metricName
        );

        const query = `
            INSERT INTO statistical_tests (
                id, experiment_id, test_type, control_group_id, test_group_id, metric_name,
                control_value, test_value, sample_size_control, sample_size_test,
                p_value, confidence_interval_lower, confidence_interval_upper,
                effect_size, statistical_power, is_significant, test_results,
                calculated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;

        const values = [
            id, data.experimentId, data.testType, data.controlGroupId, data.testGroupId,
            data.metricName, controlData.mean, testData.mean, controlData.sampleSize,
            testData.sampleSize, testResults.pValue, testResults.confidenceInterval?.lower,
            testResults.confidenceInterval?.upper, testResults.effectSize, testResults.power,
            testResults.isSignificant, JSON.stringify(testResults), now, now
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    // Attribution Analysis
    async createAttributionModel(data: Omit<AttributionModel, 'id' | 'created_at' | 'updated_at'>): Promise<AttributionModel> {
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

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    async runAttributionAnalysis(
        campaignGroupId: string,
        modelId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<{
        model: AttributionModel;
        results: AttributionResult[];
        summary: {
            totalConversions: number;
            totalRevenue: number;
            topPerformingCampaigns: Array<{
                campaignId: string;
                attributedConversions: number;
                attributedRevenue: number;
                attributionWeight: number;
            }>;
        };
        insights: string[];
    }> {
        // Get attribution model
        const modelQuery = 'SELECT * FROM attribution_models WHERE id = $1';
        const modelResult = await this.db.query(modelQuery, [modelId]);
        const model = modelResult.rows[0];

        // Get attribution results
        const resultsQuery = `
            SELECT ar.*, cp.campaign_id 
            FROM attribution_results ar
            JOIN campaign_performance cp ON ar.campaign_id = cp.campaign_id
            WHERE cp.campaign_group_id = $1 
            AND ar.attribution_model_id = $2
            AND ar.conversion_date BETWEEN $3 AND $4
            ORDER BY ar.conversion_date DESC
        `;

        const resultsResult = await this.db.query(resultsQuery, [
            campaignGroupId, modelId, dateRange.start, dateRange.end
        ]);
        const results = resultsResult.rows;

        // Calculate summary statistics
        const summary = this.calculateAttributionSummary(results);

        // Generate insights
        const insights = this.generateAttributionInsights(model, results, summary);

        return { model, results, summary, insights };
    }

    // Cohort Analysis
    async generateCohortAnalysis(
        campaignGroupId: string,
        dateRange: { start: Date; end: Date },
        cohortType: 'daily' | 'weekly' | 'monthly' = 'weekly'
    ): Promise<{
        cohorts: CohortAnalysis[];
        retentionMatrix: number[][];
        insights: string[];
    }> {
        // Calculate cohort data
        const cohorts = await this.calculateCohortData(campaignGroupId, dateRange, cohortType);

        // Create retention matrix
        const retentionMatrix = this.buildRetentionMatrix(cohorts);

        // Generate insights
        const insights = this.generateCohortInsights(cohorts, retentionMatrix);

        // Save cohort analysis to database
        for (const cohort of cohorts) {
            await this.saveCohortAnalysis(cohort);
        }

        return { cohorts, retentionMatrix, insights };
    }

    // Funnel Analysis
    async createFunnelStages(
        campaignGroupId: string,
        stages: Array<{
            stageName: string;
            eventName: string;
            description?: string;
        }>
    ): Promise<FunnelStage[]> {
        const funnelStages: FunnelStage[] = [];

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const id = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO funnel_stages (
                    id, campaign_group_id, stage_name, stage_order, event_name, description, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                id, campaignGroupId, stage.stageName, i + 1, stage.eventName, stage.description, now, now
            ];

            const result = await this.db.query(query, values);
            funnelStages.push(result.rows[0]);
        }

        return funnelStages;
    }

    async getFunnelAnalysis(
        campaignGroupId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<{
        stages: FunnelStage[];
        performance: FunnelPerformance[];
        conversionRates: number[];
        dropoffPoints: Array<{
            fromStage: string;
            toStage: string;
            dropoffRate: number;
            usersLost: number;
        }>;
        insights: string[];
    }> {
        // Get funnel stages
        const stagesQuery = `
            SELECT * FROM funnel_stages 
            WHERE campaign_group_id = $1 
            ORDER BY stage_order
        `;
        const stagesResult = await this.db.query(stagesQuery, [campaignGroupId]);
        const stages = stagesResult.rows;

        // Get funnel performance
        const performanceQuery = `
            SELECT fp.* FROM funnel_performance fp
            JOIN funnel_stages fs ON fp.funnel_stage_id = fs.id
            WHERE fs.campaign_group_id = $1
            AND fp.date BETWEEN $2 AND $3
            ORDER BY fs.stage_order, fp.date
        `;
        const performanceResult = await this.db.query(performanceQuery, [
            campaignGroupId, dateRange.start, dateRange.end
        ]);
        const performance = performanceResult.rows;

        // Calculate conversion rates and dropoff points
        const conversionRates = this.calculateFunnelConversionRates(stages, performance);
        const dropoffPoints = this.identifyFunnelDropoffPoints(stages, performance);

        // Generate insights
        const insights = this.generateFunnelInsights(stages, performance, conversionRates, dropoffPoints);

        return { stages, performance, conversionRates, dropoffPoints, insights };
    }

    // Campaign Comparison
    async compareCampaigns(
        primaryCampaignId: string,
        comparisonCampaignId: string,
        comparisonType: string,
        metrics: string[] = ['impressions', 'clicks', 'conversions', 'revenue']
    ): Promise<CampaignComparison> {
        const id = uuidv4();
        const now = new Date();

        // Get campaign performance data
        const primaryData = await this.getCampaignPerformanceData(primaryCampaignId, metrics);
        const comparisonData = await this.getCampaignPerformanceData(comparisonCampaignId, metrics);

        // Perform metric comparisons
        const metricComparisons = this.performMetricComparisons(primaryData, comparisonData, metrics);

        // Run significance tests
        const significanceResults = await this.runCampaignSignificanceTests(
            primaryData, comparisonData, metrics
        );

        // Generate insights
        const insights = this.generateComparisonInsights(
            metricComparisons, significanceResults, comparisonType
        );

        const query = `
            INSERT INTO campaign_comparisons (
                id, primary_campaign_id, comparison_campaign_id, comparison_type,
                metric_comparisons, significance_results, insights, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            id, primaryCampaignId, comparisonCampaignId, comparisonType,
            JSON.stringify(metricComparisons), JSON.stringify(significanceResults),
            JSON.stringify(insights), 'system', now, now
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    // Campaign Recommendations
    async generateRecommendations(
        campaignGroupId: string,
        analysisTypes: string[] = ['optimization', 'budget_allocation', 'audience_expansion']
    ): Promise<CampaignRecommendation[]> {
        const recommendations: CampaignRecommendation[] = [];

        for (const analysisType of analysisTypes) {
            const recs = await this.generateRecommendationsByType(campaignGroupId, analysisType);
            recommendations.push(...recs);
        }

        // Sort by impact score and priority
        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            return priorityDiff !== 0 ? priorityDiff : b.impact_score - a.impact_score;
        });
    }

    // Helper Methods
    private determineWinner(performance: CampaignPerformance[], variants: CampaignVariant[]): string | undefined {
        if (variants.length < 2) return undefined;

        const variantPerformance = variants.map(variant => {
            const variantData = performance.filter(p => p.variant_id === variant.id);
            const totalConversions = variantData.reduce((sum, p) => sum + p.conversions, 0);
            const totalImpressions = variantData.reduce((sum, p) => sum + p.impressions, 0);
            const conversionRate = totalImpressions > 0 ? totalConversions / totalImpressions : 0;

            return {
                variantId: variant.id,
                variantName: variant.name,
                conversionRate,
                totalConversions,
                totalImpressions
            };
        });

        const winner = variantPerformance.reduce((prev, current) =>
            prev.conversionRate > current.conversionRate ? prev : current
        );

        return winner.variantName;
    }

    private generateABTestInsights(
        experiment: ABExperiment,
        performance: CampaignPerformance[],
        tests: StatisticalTest[]
    ): string[] {
        const insights: string[] = [];

        // Statistical significance insights
        const significantTests = tests.filter(t => t.is_significant);
        if (significantTests.length > 0) {
            insights.push(`Found ${significantTests.length} statistically significant result(s) with 95% confidence.`);
        } else {
            insights.push('No statistically significant differences detected between variants.');
        }

        // Performance insights
        const totalConversions = performance.reduce((sum, p) => sum + p.conversions, 0);
        if (totalConversions < (experiment.sample_size_target || 100)) {
            insights.push('Sample size is below target - consider running the test longer for more reliable results.');
        }

        // Effect size insights
        const largeEffects = tests.filter(t => (t.effect_size || 0) > 0.8);
        if (largeEffects.length > 0) {
            insights.push('Large effect sizes detected - these changes could have significant business impact.');
        }

        return insights;
    }

    private async getGroupPerformanceData(groupId: string, metric: string): Promise<{
        values: number[];
        mean: number;
        sampleSize: number;
    }> {
        const query = `
            SELECT ${metric} FROM campaign_performance 
            WHERE variant_id = $1 OR campaign_id = $1
            ORDER BY date
        `;
        
        const result = await this.db.query(query, [groupId]);
        const values = result.rows.map(row => row[metric]);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

        return {
            values,
            mean,
            sampleSize: values.length
        };
    }

    private async runStatisticalTest(
        testType: string,
        controlValues: number[],
        testValues: number[],
        metric: string
    ): Promise<{
        pValue: number;
        isSignificant: boolean;
        effectSize?: number;
        confidenceInterval?: { lower: number; upper: number };
        power?: number;
    }> {
        // Simplified statistical test implementation
        // In a real implementation, you would use a proper statistical library

        const controlMean = controlValues.reduce((a, b) => a + b, 0) / controlValues.length;
        const testMean = testValues.reduce((a, b) => a + b, 0) / testValues.length;

        // Simple t-test approximation
        const controlVar = this.calculateVariance(controlValues, controlMean);
        const testVar = this.calculateVariance(testValues, testMean);
        
        const pooledStdError = Math.sqrt(
            (controlVar / controlValues.length) + (testVar / testValues.length)
        );

        const tStat = Math.abs(testMean - controlMean) / pooledStdError;
        
        // Simplified p-value calculation (use proper statistical library in production)
        const pValue = 2 * (1 - this.normalCDF(tStat));
        const isSignificant = pValue < 0.05;

        // Calculate effect size (Cohen's d)
        const pooledStd = Math.sqrt((controlVar + testVar) / 2);
        const effectSize = Math.abs(testMean - controlMean) / pooledStd;

        return {
            pValue,
            isSignificant,
            effectSize,
            confidenceInterval: {
                lower: (testMean - controlMean) - 1.96 * pooledStdError,
                upper: (testMean - controlMean) + 1.96 * pooledStdError
            },
            power: 0.8 // Simplified - calculate proper statistical power
        };
    }

    private calculateVariance(values: number[], mean: number): number {
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
    }

    private normalCDF(x: number): number {
        // Simplified normal CDF approximation
        return (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI))) / 2;
    }

    private calculateAttributionSummary(results: AttributionResult[]): any {
        const totalConversions = results.length;
        const totalRevenue = results.reduce((sum, r) => sum + (r.revenue_attributed || 0), 0);

        const campaignStats = results.reduce((acc, result) => {
            if (!acc[result.campaign_id]) {
                acc[result.campaign_id] = {
                    campaignId: result.campaign_id,
                    attributedConversions: 0,
                    attributedRevenue: 0,
                    attributionWeight: 0
                };
            }

            acc[result.campaign_id].attributedConversions += result.attribution_weight;
            acc[result.campaign_id].attributedRevenue += (result.revenue_attributed || 0) * result.attribution_weight;
            acc[result.campaign_id].attributionWeight += result.attribution_weight;

            return acc;
        }, {} as any);

        const topPerformingCampaigns = Object.values(campaignStats)
            .sort((a: any, b: any) => b.attributedRevenue - a.attributedRevenue)
            .slice(0, 10);

        return {
            totalConversions,
            totalRevenue,
            topPerformingCampaigns
        };
    }

    private generateAttributionInsights(model: AttributionModel, results: AttributionResult[], summary: any): string[] {
        const insights: string[] = [];

        insights.push(`Using ${model.type.replace('_', ' ')} attribution model for analysis.`);
        insights.push(`Total attributed revenue: $${summary.totalRevenue.toLocaleString()}`);

        if (summary.topPerformingCampaigns.length > 0) {
            const topCampaign = summary.topPerformingCampaigns[0];
            insights.push(`Top performing campaign contributes ${((topCampaign.attributedRevenue / summary.totalRevenue) * 100).toFixed(1)}% of total revenue.`);
        }

        return insights;
    }

    private async calculateCohortData(
        campaignGroupId: string,
        dateRange: { start: Date; end: Date },
        cohortType: string
    ): Promise<CohortAnalysis[]> {
        // Simplified cohort calculation - implement based on your user tracking data
        const cohorts: CohortAnalysis[] = [];
        
        // This is a placeholder - implement actual cohort calculation logic
        // based on your user acquisition and retention data
        
        return cohorts;
    }

    private buildRetentionMatrix(cohorts: CohortAnalysis[]): number[][] {
        // Build retention matrix from cohort data
        return cohorts.map(cohort => [
            cohort.day_0_retention,
            cohort.day_1_retention,
            cohort.day_7_retention,
            cohort.day_30_retention,
            cohort.day_90_retention
        ]);
    }

    private generateCohortInsights(cohorts: CohortAnalysis[], retentionMatrix: number[][]): string[] {
        const insights: string[] = [];

        if (cohorts.length === 0) return insights;

        const avgDay1Retention = cohorts.reduce((sum, c) => sum + c.day_1_retention, 0) / cohorts.length;
        const avgDay30Retention = cohorts.reduce((sum, c) => sum + c.day_30_retention, 0) / cohorts.length;

        insights.push(`Average Day 1 retention: ${(avgDay1Retention * 100).toFixed(1)}%`);
        insights.push(`Average Day 30 retention: ${(avgDay30Retention * 100).toFixed(1)}%`);

        return insights;
    }

    private async saveCohortAnalysis(cohort: CohortAnalysis): Promise<void> {
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
        `;

        const values = [
            cohort.id, cohort.campaign_group_id, cohort.cohort_date, cohort.cohort_size,
            cohort.day_0_retention, cohort.day_1_retention, cohort.day_7_retention,
            cohort.day_30_retention, cohort.day_90_retention, cohort.lifetime_value,
            cohort.avg_revenue_per_user, cohort.created_at, cohort.updated_at
        ];

        await this.db.query(query, values);
    }

    private calculateFunnelConversionRates(stages: FunnelStage[], performance: FunnelPerformance[]): number[] {
        const conversionRates: number[] = [];

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const stagePerformance = performance.filter(p => p.funnel_stage_id === stage.id);
            
            if (stagePerformance.length === 0) {
                conversionRates.push(0);
                continue;
            }

            const avgConversionRate = stagePerformance.reduce((sum, p) => sum + p.conversion_rate, 0) / stagePerformance.length;
            conversionRates.push(avgConversionRate);
        }

        return conversionRates;
    }

    private identifyFunnelDropoffPoints(stages: FunnelStage[], performance: FunnelPerformance[]): Array<{
        fromStage: string;
        toStage: string;
        dropoffRate: number;
        usersLost: number;
    }> {
        const dropoffPoints: any[] = [];

        for (let i = 0; i < stages.length - 1; i++) {
            const currentStage = stages[i];
            const nextStage = stages[i + 1];

            const currentPerformance = performance.filter(p => p.funnel_stage_id === currentStage.id);
            const nextPerformance = performance.filter(p => p.funnel_stage_id === nextStage.id);

            if (currentPerformance.length === 0 || nextPerformance.length === 0) continue;

            const currentEntries = currentPerformance.reduce((sum, p) => sum + p.entries, 0);
            const nextEntries = nextPerformance.reduce((sum, p) => sum + p.entries, 0);

            const dropoffRate = currentEntries > 0 ? (currentEntries - nextEntries) / currentEntries : 0;
            const usersLost = currentEntries - nextEntries;

            dropoffPoints.push({
                fromStage: currentStage.stage_name,
                toStage: nextStage.stage_name,
                dropoffRate,
                usersLost
            });
        }

        return dropoffPoints;
    }

    private generateFunnelInsights(
        stages: FunnelStage[],
        performance: FunnelPerformance[],
        conversionRates: number[],
        dropoffPoints: any[]
    ): string[] {
        const insights: string[] = [];

        // Find highest dropoff point
        if (dropoffPoints.length > 0) {
            const highestDropoff = dropoffPoints.reduce((prev, current) =>
                prev.dropoffRate > current.dropoffRate ? prev : current
            );

            insights.push(
                `Highest dropoff occurs between "${highestDropoff.fromStage}" and "${highestDropoff.toStage}" ` +
                `(${(highestDropoff.dropoffRate * 100).toFixed(1)}% dropoff)`
            );
        }

        // Overall funnel performance
        if (conversionRates.length > 0) {
            const overallConversion = conversionRates.reduce((product, rate) => product * rate, 1);
            insights.push(`Overall funnel conversion rate: ${(overallConversion * 100).toFixed(2)}%`);
        }

        return insights;
    }

    private async getCampaignPerformanceData(campaignId: string, metrics: string[]): Promise<any> {
        const query = `
            SELECT ${metrics.join(', ')}, date
            FROM campaign_performance 
            WHERE campaign_id = $1 
            ORDER BY date
        `;

        const result = await this.db.query(query, [campaignId]);
        return result.rows;
    }

    private performMetricComparisons(primaryData: any[], comparisonData: any[], metrics: string[]): any {
        const comparisons: any = {};

        for (const metric of metrics) {
            const primaryTotal = primaryData.reduce((sum, row) => sum + (row[metric] || 0), 0);
            const comparisonTotal = comparisonData.reduce((sum, row) => sum + (row[metric] || 0), 0);

            const percentChange = comparisonTotal > 0 
                ? ((primaryTotal - comparisonTotal) / comparisonTotal) * 100 
                : 0;

            comparisons[metric] = {
                primary: primaryTotal,
                comparison: comparisonTotal,
                difference: primaryTotal - comparisonTotal,
                percentChange
            };
        }

        return comparisons;
    }

    private async runCampaignSignificanceTests(
        primaryData: any[], 
        comparisonData: any[], 
        metrics: string[]
    ): Promise<any> {
        const significanceResults: any = {};

        for (const metric of metrics) {
            const primaryValues = primaryData.map(row => row[metric] || 0);
            const comparisonValues = comparisonData.map(row => row[metric] || 0);

            const testResult = await this.runStatisticalTest(
                'ttest',
                comparisonValues,
                primaryValues,
                metric
            );

            significanceResults[metric] = testResult;
        }

        return significanceResults;
    }

    private generateComparisonInsights(
        metricComparisons: any,
        significanceResults: any,
        comparisonType: string
    ): string[] {
        const insights: string[] = [];

        for (const metric in metricComparisons) {
            const comparison = metricComparisons[metric];
            const significance = significanceResults[metric];

            if (significance.isSignificant) {
                const direction = comparison.percentChange > 0 ? 'increase' : 'decrease';
                insights.push(
                    `Statistically significant ${Math.abs(comparison.percentChange).toFixed(1)}% ${direction} in ${metric}`
                );
            }
        }

        if (insights.length === 0) {
            insights.push('No statistically significant differences found between campaigns');
        }

        return insights;
    }

    private async generateRecommendationsByType(
        campaignGroupId: string,
        analysisType: string
    ): Promise<CampaignRecommendation[]> {
        const recommendations: CampaignRecommendation[] = [];

        // This would implement different recommendation algorithms based on type
        // For now, returning empty array - implement actual recommendation logic

        return recommendations;
    }
}