import { QRScanEvent, AnalyticsData, ServiceResponse } from '@qr-saas/shared';
import { AnalyticsRepository } from '../repositories/analytics.repository';

export class AnalyticsService {
  constructor(private analyticsRepository: AnalyticsRepository) {}

  async trackScan(qrCodeId: string, scanData: any): Promise<ServiceResponse> {
    try {
      const processedData = this.processScanData(scanData);
      
      const scanEvent: QRScanEvent = {
        qrCodeId,
        ipHash: this.hashIP(scanData.ipAddress),
        userAgent: scanData.userAgent,
        platform: processedData.platform,
        browser: processedData.browser,
        country: processedData.country,
        city: processedData.city,
        referrer: scanData.referrer,
        scannedAt: new Date()
      };

      await this.analyticsRepository.createScanEvent(scanEvent);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_TRACKING_FAILED',
          message: 'Failed to track scan event',
          statusCode: 500,
          details: error
        }
      };
    }
  }

  async getQRAnalytics(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<ServiceResponse<AnalyticsData>> {
    try {
      const analytics = await this.analyticsRepository.getAnalyticsSummary(qrCodeId, startDate, endDate);
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to fetch analytics data',
          statusCode: 500,
          details: error
        }
      };
    }
  }

  private processScanData(scanData: any) {
    // TODO: Implement proper user agent parsing and geo-location
    // For now, use simple fallbacks
    const platform = scanData.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop';
    const browser = scanData.userAgent?.includes('Chrome') ? 'Chrome' : 
                   scanData.userAgent?.includes('Firefox') ? 'Firefox' : 
                   scanData.userAgent?.includes('Safari') ? 'Safari' : 'Unknown';

    return {
      platform,
      browser,
      country: 'Unknown',
      city: 'Unknown'
    };
  }

  private hashIP(ip: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT).digest('hex').substring(0, 16);
  }
}