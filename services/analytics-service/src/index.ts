import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApiResponse } from '@qr-saas/shared';
import { AnalyticsService } from './services/analytics.service';

dotenv.config({ path: '../../.env' });

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize dependencies (temporary mock implementation)
// TODO: Connect to actual database and implement AnalyticsRepository
const mockRepository = {
  createScanEvent: async () => {},
  getAnalyticsSummary: async () => ({ totalScans: 0, uniqueScans: 0, platformBreakdown: {}, geographicData: [], timeSeriesData: [] })
};
const analyticsService = new AnalyticsService(mockRepository as any);

app.get('/health', (req, res) => {
  const response: ApiResponse<{ status: string; service: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString()
    }
  };
  res.json(response);
});

app.post('/analytics/track', async (req, res) => {
  const { qrCodeId, ...scanData } = req.body;
  const result = await analyticsService.trackScan(qrCodeId, {
    ...scanData,
    ipAddress: req.ip
  });
  
  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }
  
  res.json(result);
});

app.get('/analytics/:qrCodeId', async (req, res) => {
  const { qrCodeId } = req.params;
  const { startDate, endDate } = req.query;
  
  const result = await analyticsService.getQRAnalytics(
    qrCodeId,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );
  
  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }
  
  res.json(result);
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});