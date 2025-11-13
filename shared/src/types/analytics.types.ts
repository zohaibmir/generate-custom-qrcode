// Core Analytics Data
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

// Advanced Analytics Types
export interface PeakTimeAnalysis {
  hourlyDistribution: Array<{
    hour: number;
    scans: number;
    percentage: number;
    isBusinessHour: boolean;
  }>;
  dailyDistribution: Array<{
    dayOfWeek: number;
    dayName: string;
    scans: number;
    percentage: number;
    isWeekend: boolean;
  }>;
  seasonalTrends: Array<{
    month: number;
    monthName: string;
    scans: number;
    percentage: number;
    growthRate: number;
  }>;
  peakHours: Array<{
    hour: number;
    scans: number;
    efficiency: number;
  }>;
  recommendations: Array<{
    type: 'timing' | 'promotion' | 'optimization';
    message: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

// Conversion Tracking
export interface ConversionGoal {
  id: string;
  qrCodeId: string;
  name: string;
  type: 'url_visit' | 'form_submit' | 'purchase' | 'download' | 'custom';
  targetUrl?: string;
  targetValue?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionEvent {
  id: string;
  goalId: string;
  scanEventId: string;
  qrCodeId: string;
  userId?: string;
  conversionValue?: number;
  conversionData?: Record<string, any>;
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  timeToConversion: number;
  createdAt: Date;
}

export interface ConversionFunnel {
  goalId: string;
  goalName: string;
  stages: Array<{
    stage: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  totalConversions: number;
  overallConversionRate: number;
  averageTimeToConversion: number;
  topConvertingSegments: Array<{
    segment: string;
    conversionRate: number;
    count: number;
  }>;
}

// Heatmap Types
export interface HeatmapData {
  id: string;
  type: 'geographic' | 'temporal' | 'device' | 'combined';
  qrCodeId: string;
  dataPoints: Array<{
    x: number;
    y: number;
    value: number;
    intensity: number;
    metadata?: Record<string, any>;
  }>;
  maxValue: number;
  minValue: number;
  averageValue: number;
  generatedAt: Date;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface GeographicHeatmap extends HeatmapData {
  type: 'geographic';
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevel: number;
  countryData: Array<{
    countryCode: string;
    countryName: string;
    intensity: number;
    scans: number;
  }>;
}

export interface TemporalHeatmap extends HeatmapData {
  type: 'temporal';
  timeGranularity: 'hour' | 'day' | 'week' | 'month';
  patternAnalysis: {
    strongestPeriods: Array<{ period: string; intensity: number }>;
    weakestPeriods: Array<{ period: string; intensity: number }>;
    cyclicalPatterns: Array<{ pattern: string; confidence: number }>;
  };
}

// Advanced Export Types
export interface ExportConfiguration {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  template: 'standard' | 'executive' | 'detailed' | 'custom';
  includeCharts: boolean;
  includeMaps: boolean;
  includeRawData: boolean;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters: {
    countries?: string[];
    platforms?: string[];
    devices?: string[];
    conversionGoals?: string[];
  };
  customSections?: Array<{
    title: string;
    type: 'table' | 'chart' | 'map' | 'text';
    configuration: Record<string, any>;
  }>;
}

export interface ExportResult {
  id: string;
  format: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
  metadata: {
    recordCount: number;
    generationTime: number;
    compression?: string;
  };
}

// Real-time Analytics
export interface RealTimeMetrics {
  qrCodeId: string;
  timestamp: Date;
  activeScans: number;
  currentViewers: number;
  scansPerSecond: number;
  peakConcurrency: number;
  responseTime: number;
  errorRate: number;
  dataTransfer: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastUpdated: Date;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  recentScans: Array<{
    id: string;
    timestamp: Date;
    country: string;
    device: string;
    platform: string;
  }>;
  alerts: Array<{
    type: 'spike' | 'drop' | 'anomaly' | 'threshold';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
  }>;
}

export interface AnalyticsSnapshot {
  qrCodeId: string;
  timestamp: Date;
  realTimeMetrics: RealTimeMetrics;
  quickStats: {
    totalScans: number;
    scansLast24h: number;
    scansLastHour: number;
    uniqueCountries: number;
    topDevice: string;
  };
  recentActivity: Array<{
    id: string;
    timestamp: Date;
    country?: string;
    device?: string;
    platform?: string;
  }>;
  performanceIndicators: {
    averageResponseTime: number;
    errorRate: number;
    peakConcurrency: number;
    dataFreshness: Date;
  };
}

export interface AnalyticsAlert {
  id: string;
  qrCodeId: string;
  userId: string;
  type: 'scan_threshold' | 'conversion_drop' | 'traffic_spike' | 'anomaly';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'change_percent';
    threshold: number;
    timeWindow: number;
  };
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Dashboard Types
export interface DashboardWidget {
  id: string;
  dashboardId?: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'heatmap' | 'gauge' | 'text';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: Record<string, any>;
  dataSource: string;
  dataFilters?: Record<string, any>;
  refreshInterval: number;
  isVisible: boolean;
  isRealTime?: boolean;
  cacheDuration?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  compactType?: 'vertical' | 'horizontal';
  preventCollision?: boolean;
}

export interface DashboardTheme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  backgroundColor: string;
  cardBackground: string;
  textColor: string;
  borderColor: string;
  fontFamily?: string;
}

export interface AnalyticsDashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  layout?: DashboardLayout;
  theme?: DashboardTheme;
  category?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
  isFavorite?: boolean;
  viewCount?: number;
  tags?: string[];
  widgets: DashboardWidget[];
  sharedWith?: string[];
  createdAt: Date;
  updatedAt: Date;
  ownerEmail?: string;
  ownerName?: string;
  widgetCount?: number;
  shareCount?: number;
  isFavorited?: boolean;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  layout: DashboardLayout;
  theme: DashboardTheme;
  widgetConfigs: any[];
  tags: string[];
  isPremium?: boolean;
  usageCount?: number;
  rating?: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetDataSource {
  id: string;
  name: string;
  type: 'analytics' | 'qr_codes' | 'campaigns' | 'ecommerce' | 'content' | 'custom';
  endpoint?: string;
  authentication?: {
    type: 'none' | 'api_key' | 'oauth' | 'basic';
    configuration: Record<string, any>;
  };
  parameters?: Record<string, any>;
  refreshRate?: number;
  isActive: boolean;
}

export interface DashboardShare {
  id: number;
  dashboardId: string;
  sharedBy: string;
  sharedWith?: string;
  shareType: 'view' | 'edit' | 'admin';
  accessToken?: string;
  expiresAt?: Date;
  passwordHash?: string;
  createdAt: Date;
}

export interface DashboardActivity {
  id: number;
  dashboardId: string;
  userId: string;
  action: 'created' | 'updated' | 'viewed' | 'shared' | 'exported' | 'deleted';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Advanced Analytics Requests
export interface AdvancedAnalyticsRequest {
  qrCodeIds: string[];
  timeRange: {
    startDate: Date;
    endDate: Date;
    timezone?: string;
  };
  metrics: Array<'scans' | 'conversions' | 'engagement' | 'geographic' | 'temporal'>;
  groupBy?: Array<'hour' | 'day' | 'week' | 'month' | 'country' | 'device' | 'platform'>;
  filters?: {
    countries?: string[];
    devices?: string[];
    platforms?: string[];
    conversionGoals?: string[];
  };
  includeComparisons?: boolean;
  includePredictions?: boolean;
  includeRecommendations?: boolean;
}

export interface AdvancedAnalyticsResponse {
  summary: {
    totalScans: number;
    uniqueScans: number;
    conversionRate: number;
    engagementScore: number;
    growthRate: number;
  };
  timeSeries: Array<{
    timestamp: Date;
    scans: number;
    conversions: number;
    uniqueVisitors: number;
    engagementScore: number;
  }>;
  breakdowns: {
    geographic: Array<{ country: string; scans: number; conversions: number }>;
    devices: Array<{ device: string; scans: number; conversions: number }>;
    platforms: Array<{ platform: string; scans: number; conversions: number }>;
  };
  peakTimes: PeakTimeAnalysis;
  conversionFunnels: ConversionFunnel[];
  heatmaps: HeatmapData[];
  predictions?: {
    nextPeriodScans: number;
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  };
  recommendations: Array<{
    category: 'optimization' | 'marketing' | 'technical';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialImpact: string;
    actionItems: string[];
  }>;
  metadata: {
    generatedAt: Date;
    processingTime: number;
    dataQuality: number;
    coverage: number;
  };
}