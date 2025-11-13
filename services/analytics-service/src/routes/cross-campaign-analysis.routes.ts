import { Router } from 'express';
import { Pool } from 'pg';
import { CrossCampaignAnalysisController } from '../controllers/cross-campaign-analysis.controller';

export function createCrossCampaignAnalysisRoutes(db: Pool): Router {
    const router = Router();
    const controller = new CrossCampaignAnalysisController(db);

    // Campaign Groups
    router.post('/campaign-groups', (req, res) => controller.createCampaignGroup(req, res));
    router.get('/campaign-groups', (req, res) => controller.getCampaignGroups(req, res));
    router.get('/campaign-groups/:id', (req, res) => controller.getCampaignGroup(req, res));
    router.get('/campaign-groups/:campaignGroupId/dashboard', (req, res) => controller.getDashboardSummary(req, res));

    // A/B Testing
    router.post('/ab-experiments', (req, res) => controller.createABExperiment(req, res));
    router.get('/ab-experiments/:experimentId/results', (req, res) => controller.getABExperimentResults(req, res));
    router.patch('/ab-experiments/:id', (req, res) => controller.updateABExperiment(req, res));
    router.post('/statistical-tests', (req, res) => controller.performStatisticalTest(req, res));

    // Attribution Analysis
    router.post('/attribution-models', (req, res) => controller.createAttributionModel(req, res));
    router.get('/attribution-models', (req, res) => controller.getAttributionModels(req, res));
    router.post('/campaign-groups/:campaignGroupId/attribution-analysis', (req, res) => controller.runAttributionAnalysis(req, res));

    // Cohort Analysis
    router.post('/campaign-groups/:campaignGroupId/cohort-analysis', (req, res) => controller.generateCohortAnalysis(req, res));
    router.get('/campaign-groups/:campaignGroupId/cohort-analysis', (req, res) => controller.getCohortAnalysis(req, res));

    // Funnel Analysis
    router.post('/campaign-groups/:campaignGroupId/funnel-stages', (req, res) => controller.createFunnelStages(req, res));
    router.get('/campaign-groups/:campaignGroupId/funnel-analysis', (req, res) => controller.getFunnelAnalysis(req, res));

    // Campaign Comparison
    router.post('/campaign-comparisons', (req, res) => controller.compareCampaigns(req, res));
    router.get('/campaigns/:campaignId/comparisons', (req, res) => controller.getCampaignComparisons(req, res));

    // Campaign Recommendations
    router.post('/campaign-groups/:campaignGroupId/recommendations', (req, res) => controller.generateRecommendations(req, res));
    router.get('/campaign-groups/:campaignGroupId/recommendations', (req, res) => controller.getRecommendations(req, res));
    router.patch('/recommendations/:id/status', (req, res) => controller.updateRecommendationStatus(req, res));

    // Performance Data
    router.get('/campaign-performance', (req, res) => controller.getCampaignPerformance(req, res));
    router.post('/campaign-performance/bulk', (req, res) => controller.bulkCreatePerformanceData(req, res));

    return router;
}

export default createCrossCampaignAnalysisRoutes;