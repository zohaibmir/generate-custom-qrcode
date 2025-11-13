import { Request, Response } from 'express';
import { CrossCampaignAnalysisService } from '../services/cross-campaign-analysis.service';
import { CrossCampaignAnalysisRepository } from '../repositories/cross-campaign-analysis.repository';
import { Pool } from 'pg';

export class CrossCampaignAnalysisController {
    private crossCampaignService: CrossCampaignAnalysisService;
    private repository: CrossCampaignAnalysisRepository;

    constructor(private db: Pool) {
        this.crossCampaignService = new CrossCampaignAnalysisService(db);
        this.repository = new CrossCampaignAnalysisRepository(db);
    }

    // Campaign Groups
    async createCampaignGroup(req: Request, res: Response): Promise<void> {
        try {
            const { name, description, status, start_date, end_date, metadata } = req.body;
            const created_by = req.user?.id || 'system'; // Assuming user is attached to request

            const campaignGroup = await this.crossCampaignService.createCampaignGroup({
                name,
                description,
                status,
                start_date: new Date(start_date),
                end_date: end_date ? new Date(end_date) : undefined,
                created_by,
                metadata
            });

            res.status(201).json({
                success: true,
                data: campaignGroup,
                message: 'Campaign group created successfully'
            });
        } catch (error) {
            console.error('Error creating campaign group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create campaign group',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getCampaignGroups(req: Request, res: Response): Promise<void> {
        try {
            const {
                status,
                created_by,
                start_date,
                end_date,
                page = 1,
                limit = 20
            } = req.query;

            const filters: any = {};
            
            if (status) filters.status = status as string;
            if (created_by) filters.created_by = created_by as string;
            if (start_date && end_date) {
                filters.date_range = {
                    start: new Date(start_date as string),
                    end: new Date(end_date as string)
                };
            }

            const offset = (Number(page) - 1) * Number(limit);
            const result = await this.repository.getCampaignGroups({
                ...filters,
                limit: Number(limit),
                offset
            });

            res.json({
                success: true,
                data: {
                    campaign_groups: result.groups,
                    pagination: {
                        current_page: Number(page),
                        total_pages: Math.ceil(result.total / Number(limit)),
                        total_items: result.total,
                        items_per_page: Number(limit)
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching campaign groups:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign groups',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getCampaignGroup(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const campaignGroup = await this.repository.getCampaignGroupById(id);

            if (!campaignGroup) {
                res.status(404).json({
                    success: false,
                    message: 'Campaign group not found'
                });
                return;
            }

            // Get related data
            const [variants, experiments] = await Promise.all([
                this.repository.getVariantsByCampaignGroup(id),
                this.repository.getExperimentsByCampaignGroup(id)
            ]);

            res.json({
                success: true,
                data: {
                    campaign_group: campaignGroup,
                    variants,
                    experiments
                }
            });
        } catch (error) {
            console.error('Error fetching campaign group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign group',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // A/B Testing
    async createABExperiment(req: Request, res: Response): Promise<void> {
        try {
            const {
                campaign_group_id,
                name,
                description,
                hypothesis,
                start_date,
                end_date,
                sample_size_target,
                confidence_level,
                expected_improvement,
                primary_metric,
                secondary_metrics
            } = req.body;

            const created_by = req.user?.id || 'system';

            const experiment = await this.crossCampaignService.createABExperiment({
                campaign_group_id,
                name,
                description,
                hypothesis,
                status: 'draft',
                start_date: new Date(start_date),
                end_date: end_date ? new Date(end_date) : undefined,
                sample_size_target,
                confidence_level,
                expected_improvement,
                primary_metric,
                secondary_metrics,
                created_by
            });

            res.status(201).json({
                success: true,
                data: experiment,
                message: 'A/B experiment created successfully'
            });
        } catch (error) {
            console.error('Error creating A/B experiment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create A/B experiment',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getABExperimentResults(req: Request, res: Response): Promise<void> {
        try {
            const { experimentId } = req.params;
            const results = await this.crossCampaignService.getABExperimentResults(experimentId);

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('Error fetching A/B experiment results:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch A/B experiment results',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async updateABExperiment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Convert date strings to Date objects if present
            if (updates.start_date) updates.start_date = new Date(updates.start_date);
            if (updates.end_date) updates.end_date = new Date(updates.end_date);

            const experiment = await this.repository.updateABExperiment(id, updates);

            if (!experiment) {
                res.status(404).json({
                    success: false,
                    message: 'A/B experiment not found'
                });
                return;
            }

            res.json({
                success: true,
                data: experiment,
                message: 'A/B experiment updated successfully'
            });
        } catch (error) {
            console.error('Error updating A/B experiment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update A/B experiment',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Statistical Testing
    async performStatisticalTest(req: Request, res: Response): Promise<void> {
        try {
            const {
                experimentId,
                testType,
                controlGroupId,
                testGroupId,
                metricName
            } = req.body;

            const result = await this.crossCampaignService.performStatisticalTest({
                experimentId,
                testType,
                controlGroupId,
                testGroupId,
                metricName
            });

            res.json({
                success: true,
                data: result,
                message: 'Statistical test completed successfully'
            });
        } catch (error) {
            console.error('Error performing statistical test:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to perform statistical test',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Attribution Analysis
    async createAttributionModel(req: Request, res: Response): Promise<void> {
        try {
            const { name, type, configuration, description, is_default } = req.body;

            const model = await this.crossCampaignService.createAttributionModel({
                name,
                type,
                configuration,
                description,
                is_default: is_default || false
            });

            res.status(201).json({
                success: true,
                data: model,
                message: 'Attribution model created successfully'
            });
        } catch (error) {
            console.error('Error creating attribution model:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create attribution model',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getAttributionModels(req: Request, res: Response): Promise<void> {
        try {
            const models = await this.repository.getAttributionModels();

            res.json({
                success: true,
                data: models
            });
        } catch (error) {
            console.error('Error fetching attribution models:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch attribution models',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async runAttributionAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { modelId, start_date, end_date } = req.body;

            const dateRange = {
                start: new Date(start_date),
                end: new Date(end_date)
            };

            const analysis = await this.crossCampaignService.runAttributionAnalysis(
                campaignGroupId,
                modelId,
                dateRange
            );

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error running attribution analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to run attribution analysis',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Cohort Analysis
    async generateCohortAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { start_date, end_date, cohort_type = 'weekly' } = req.body;

            const dateRange = {
                start: new Date(start_date),
                end: new Date(end_date)
            };

            const analysis = await this.crossCampaignService.generateCohortAnalysis(
                campaignGroupId,
                dateRange,
                cohort_type as 'daily' | 'weekly' | 'monthly'
            );

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error generating cohort analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate cohort analysis',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getCohortAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { start_date, end_date } = req.query;

            let dateRange;
            if (start_date && end_date) {
                dateRange = {
                    start: new Date(start_date as string),
                    end: new Date(end_date as string)
                };
            }

            const cohorts = await this.repository.getCohortAnalysisByCampaignGroup(
                campaignGroupId,
                dateRange
            );

            res.json({
                success: true,
                data: cohorts
            });
        } catch (error) {
            console.error('Error fetching cohort analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cohort analysis',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Funnel Analysis
    async createFunnelStages(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { stages } = req.body;

            const funnelStages = await this.crossCampaignService.createFunnelStages(
                campaignGroupId,
                stages
            );

            res.status(201).json({
                success: true,
                data: funnelStages,
                message: 'Funnel stages created successfully'
            });
        } catch (error) {
            console.error('Error creating funnel stages:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create funnel stages',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getFunnelAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { start_date, end_date } = req.query;

            if (!start_date || !end_date) {
                res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
                return;
            }

            const dateRange = {
                start: new Date(start_date as string),
                end: new Date(end_date as string)
            };

            const analysis = await this.crossCampaignService.getFunnelAnalysis(
                campaignGroupId,
                dateRange
            );

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error fetching funnel analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch funnel analysis',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Campaign Comparison
    async compareCampaigns(req: Request, res: Response): Promise<void> {
        try {
            const {
                primaryCampaignId,
                comparisonCampaignId,
                comparisonType,
                metrics
            } = req.body;

            const comparison = await this.crossCampaignService.compareCampaigns(
                primaryCampaignId,
                comparisonCampaignId,
                comparisonType,
                metrics
            );

            res.json({
                success: true,
                data: comparison,
                message: 'Campaign comparison completed successfully'
            });
        } catch (error) {
            console.error('Error comparing campaigns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to compare campaigns',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getCampaignComparisons(req: Request, res: Response): Promise<void> {
        try {
            const { campaignId } = req.params;
            const comparisons = await this.repository.getCampaignComparisons(campaignId);

            res.json({
                success: true,
                data: comparisons
            });
        } catch (error) {
            console.error('Error fetching campaign comparisons:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign comparisons',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Campaign Recommendations
    async generateRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { analysisTypes } = req.body;

            const recommendations = await this.crossCampaignService.generateRecommendations(
                campaignGroupId,
                analysisTypes
            );

            res.json({
                success: true,
                data: recommendations,
                message: 'Recommendations generated successfully'
            });
        } catch (error) {
            console.error('Error generating recommendations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate recommendations',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { status } = req.query;

            const recommendations = await this.repository.getRecommendationsByCampaignGroup(
                campaignGroupId,
                status as string
            );

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recommendations',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async updateRecommendationStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const recommendation = await this.repository.updateRecommendationStatus(id, status);

            if (!recommendation) {
                res.status(404).json({
                    success: false,
                    message: 'Recommendation not found'
                });
                return;
            }

            res.json({
                success: true,
                data: recommendation,
                message: 'Recommendation status updated successfully'
            });
        } catch (error) {
            console.error('Error updating recommendation status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update recommendation status',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Performance Data
    async getCampaignPerformance(req: Request, res: Response): Promise<void> {
        try {
            const {
                campaign_id,
                campaign_group_id,
                variant_id,
                start_date,
                end_date,
                metrics
            } = req.query;

            const filters: any = {};
            
            if (campaign_id) filters.campaign_id = campaign_id as string;
            if (campaign_group_id) filters.campaign_group_id = campaign_group_id as string;
            if (variant_id) filters.variant_id = variant_id as string;
            if (metrics) filters.metrics = (metrics as string).split(',');

            if (start_date && end_date) {
                filters.date_range = {
                    start: new Date(start_date as string),
                    end: new Date(end_date as string)
                };
            }

            const performance = await this.repository.getCampaignPerformance(filters);

            res.json({
                success: true,
                data: performance
            });
        } catch (error) {
            console.error('Error fetching campaign performance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign performance',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Bulk Operations
    async bulkCreatePerformanceData(req: Request, res: Response): Promise<void> {
        try {
            const { performances } = req.body;

            if (!Array.isArray(performances) || performances.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Performances array is required and cannot be empty'
                });
                return;
            }

            // Convert date strings to Date objects
            const processedPerformances = performances.map(perf => ({
                ...perf,
                date: new Date(perf.date)
            }));

            const results = await this.repository.bulkCreateCampaignPerformance(processedPerformances);

            res.status(201).json({
                success: true,
                data: results,
                message: `${results.length} performance records created successfully`
            });
        } catch (error) {
            console.error('Error bulk creating performance data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to bulk create performance data',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Dashboard Summary
    async getDashboardSummary(req: Request, res: Response): Promise<void> {
        try {
            const { campaignGroupId } = req.params;
            const { start_date, end_date } = req.query;

            if (!start_date || !end_date) {
                res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
                return;
            }

            const dateRange = {
                start: new Date(start_date as string),
                end: new Date(end_date as string)
            };

            // Get campaign group details
            const campaignGroup = await this.repository.getCampaignGroupById(campaignGroupId);
            
            if (!campaignGroup) {
                res.status(404).json({
                    success: false,
                    message: 'Campaign group not found'
                });
                return;
            }

            // Get performance summary
            const performance = await this.repository.getCampaignPerformance({
                campaign_group_id: campaignGroupId,
                date_range: dateRange
            });

            // Get active experiments
            const experiments = await this.repository.getExperimentsByCampaignGroup(campaignGroupId);
            
            // Get recent recommendations
            const recommendations = await this.repository.getRecommendationsByCampaignGroup(
                campaignGroupId,
                'pending'
            );

            // Calculate summary metrics
            const totalImpressions = performance.reduce((sum, p) => sum + p.impressions, 0);
            const totalClicks = performance.reduce((sum, p) => sum + p.clicks, 0);
            const totalConversions = performance.reduce((sum, p) => sum + p.conversions, 0);
            const totalRevenue = performance.reduce((sum, p) => sum + (p.revenue || 0), 0);
            const totalCost = performance.reduce((sum, p) => sum + (p.cost || 0), 0);

            const summary = {
                campaign_group: campaignGroup,
                metrics: {
                    total_impressions: totalImpressions,
                    total_clicks: totalClicks,
                    total_conversions: totalConversions,
                    total_revenue: totalRevenue,
                    total_cost: totalCost,
                    click_through_rate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
                    conversion_rate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
                    cost_per_conversion: totalConversions > 0 ? totalCost / totalConversions : 0,
                    return_on_ad_spend: totalCost > 0 ? (totalRevenue / totalCost) * 100 : 0
                },
                active_experiments: experiments.filter(e => e.status === 'running').length,
                pending_recommendations: recommendations.length,
                performance_trend: performance.length > 0 ? 'Available' : 'No data'
            };

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard summary',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}