export interface AnalyticsData {
  totalScans: number;
  uniqueScans: number;
  platformBreakdown: Record<string, number>;
  geographicData: Array<{
    country: string;
    count: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    scans: number;
  }>;
}

export interface DailyAnalytics {
  id: string;
  qrCodeId: string;
  date: Date;
  totalScans: number;
  uniqueScans: number;
  topPlatform?: string;
  topCountry?: string;
  createdAt: Date;
}