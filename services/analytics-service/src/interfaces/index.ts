import { AnalyticsSnapshot } from '../../../../shared/src/types/analytics.types';

// Re-export AnalyticsSnapshot for consistency
export { AnalyticsSnapshot } from '../../../../shared/src/types/analytics.types';

// Domain Entities
export interface ScanEvent {
  id: string;
  qrCodeId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  platform?: string;
  device?: string;
  referrer?: string;
}

export interface AnalyticsSummary {
  totalScans: number;
  uniqueScans: number;
  scansByDate: { date: string; scans: number }[];
  platformBreakdown: { [platform: string]: number };
  deviceBreakdown: { [device: string]: number };
  geographicData: {
    country: string;
    scans: number;
    percentage: number;
  }[];
  timeSeriesData: {
    timestamp: string;
    scans: number;
    uniqueScans: number;
  }[];
}

// Request/Response Types
export interface TrackScanRequest {
  qrCodeId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  platform?: string;
  device?: string;
  referrer?: string;
}

export interface GetAnalyticsRequest {
  qrCodeId: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}

// Repository Interfaces
export interface IAnalyticsRepository {
  // Core analytics methods
  createScanEvent(scanEvent: Omit<ScanEvent, 'id'>): Promise<ScanEvent>;
  getScanEventsByQRCode(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<ScanEvent[]>;
  getAnalyticsSummary(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSummary>;
  getUserAnalyticsSummary(userId?: string, startDate?: Date, endDate?: Date): Promise<AnalyticsSummary>;
  getTotalScansForQRCode(qrCodeId: string): Promise<number>;
  getUniqueScansForQRCode(qrCodeId: string): Promise<number>;
  getScansGroupedByDate(qrCodeId: string, startDate?: Date, endDate?: Date): Promise<{ date: string; scans: number }[]>;
  getPlatformBreakdown(qrCodeId: string): Promise<{ [platform: string]: number }>;
  getDeviceBreakdown(qrCodeId: string): Promise<{ [device: string]: number }>;
  getGeographicData(qrCodeId: string): Promise<{ country: string; scans: number; percentage: number }[]>;
  
  // Advanced analytics methods
  // Conversion tracking
  createConversionGoal(goal: Omit<ConversionGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionGoal>;
  updateConversionGoal(goalId: string, updates: Partial<ConversionGoal>): Promise<ConversionGoal>;
  getConversionGoal(goalId: string): Promise<ConversionGoal | null>;
  getConversionGoalsByQRCode(qrCodeId: string): Promise<ConversionGoal[]>;
  createConversionEvent(event: Omit<ConversionEvent, 'id' | 'timestamp'>): Promise<ConversionEvent>;
  getConversionEventsByGoal(goalId: string, startDate?: Date, endDate?: Date): Promise<ConversionEvent[]>;
  getConversionFunnelData(goalId: string, startDate?: Date, endDate?: Date): Promise<ConversionFunnel>;
  
  // Heatmap data
  updateHeatmapData(qrCodeId: string, heatmapType: string, dataKey: string, increment: number, metadata?: any): Promise<void>;
  getHeatmapData(qrCodeId: string, heatmapType: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  normalizeHeatmapData(qrCodeId: string, heatmapType: string): Promise<number>;
  
  // Real-time metrics
  cacheRealtimeMetric(qrCodeId: string, metricType: string, value: number, unit?: string, ttl?: number): Promise<void>;
  getRealtimeMetrics(qrCodeId: string, metricTypes?: string[]): Promise<Record<string, any>>;
  clearExpiredMetrics(): Promise<number>;
  
  // Peak time analysis
  savePeakTimeAnalysis(qrCodeId: string, analysis: PeakTimeAnalysis): Promise<void>;
  getPeakTimeAnalysis(qrCodeId: string, date?: Date): Promise<PeakTimeAnalysis | null>;
  
  // Export jobs
  createExportJob(job: Omit<any, 'id' | 'createdAt'>): Promise<any>;
  updateExportJob(jobId: string, updates: any): Promise<any>;
  getExportJob(jobId: string): Promise<any | null>;
  getUserExportJobs(userId: string, limit?: number): Promise<any[]>;
  
  // Analytics alerts
  createAnalyticsAlert(alert: Omit<any, 'id' | 'createdAt' | 'updatedAt'>): Promise<any>;
  getAnalyticsAlerts(qrCodeId: string): Promise<any[]>;
  updateAlertTrigger(alertId: string, triggeredAt: Date, value: number): Promise<void>;

  // Marketing Tools Methods
  // Campaign management
  createCampaign(campaign: any): Promise<any>;
  getCampaign(campaignId: string, userId: string): Promise<any | null>;
  getUserCampaigns(userId: string, limit?: number, offset?: number): Promise<any[]>;
  updateCampaign(campaignId: string, updates: any): Promise<any>;
  deleteCampaign(campaignId: string): Promise<boolean>;
  
  // Campaign QR Code associations
  createCampaignQRCode(association: any): Promise<any>;
  getCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<any | null>;
  getCampaignQRCodes(campaignId: string): Promise<any[]>;
  removeCampaignQRCodeAssociation(campaignId: string, qrCodeId: string): Promise<boolean>;
  updateCampaignQRCodeStats(campaignId: string, qrCodeId: string, scansIncrement?: number, conversionsIncrement?: number): Promise<void>;
  
  // UTM tracking
  createUTMTracking(utmTracking: any): Promise<any>;
  getUTMTracking(utmTrackingId: string, userId: string): Promise<any | null>;
  getUTMTrackingByQRCode(qrCodeId: string, userId: string): Promise<any[]>;
  updateUTMTracking(utmTrackingId: string, updates: any): Promise<any>;
  deleteUTMTracking(utmTrackingId: string): Promise<boolean>;
  
  // UTM events
  createUTMEvent(event: any): Promise<any>;
  getUTMEvents(utmTrackingId: string, limit?: number, offset?: number): Promise<any[]>;
  updateUTMTrackingStats(utmTrackingId: string, eventType: string): Promise<void>;
  
  // Retargeting pixels
  createRetargetingPixel(pixel: any): Promise<any>;
  getRetargetingPixel(pixelId: string, userId: string): Promise<any | null>;
  getRetargetingPixelById(pixelId: string): Promise<any | null>;
  getUserRetargetingPixels(userId: string, limit?: number, offset?: number): Promise<any[]>;
  updateRetargetingPixel(pixelId: string, updates: any): Promise<any>;
  deleteRetargetingPixel(pixelId: string): Promise<boolean>;
  incrementPixelFireCount(pixelId: string): Promise<void>;
  
  // Retargeting pixel events
  createRetargetingPixelEvent(event: any): Promise<any>;
  getRetargetingPixelEvents(pixelId: string, limit?: number, offset?: number): Promise<any[]>;
  updateRetargetingPixelEvent(eventId: string, updates: any): Promise<any>;
  
  // Campaign analytics
  createCampaignAnalytics(analytics: any): Promise<any>;
  getCampaignAnalytics(campaignId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  updateCampaignAnalytics(campaignId: string, date: Date, updates: any): Promise<any>;
  
  // Campaign conversion attribution
  createCampaignConversionAttribution(attribution: any): Promise<any>;
  getCampaignConversionAttributions(campaignId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
}

// Service Interfaces
export interface IAnalyticsService {
  trackScan(scanData: TrackScanRequest): Promise<ServiceResponse<ScanEvent>>;
  getQRAnalytics(request: GetAnalyticsRequest): Promise<ServiceResponse<AnalyticsSummary>>;
  getUserAnalytics(userId?: string, startDate?: Date, endDate?: Date): Promise<ServiceResponse<AnalyticsSummary>>;
  exportAnalytics(qrCodeId: string, format: 'json' | 'csv', startDate?: Date, endDate?: Date): Promise<ServiceResponse<string>>;
  getAdvancedAnalytics(request: AdvancedAnalyticsRequest): Promise<ServiceResponse<AdvancedAnalyticsResponse>>;
}

export interface IPeakTimeAnalysisService {
  analyzePeakTimes(qrCodeId: string, timeRange?: { startDate: Date; endDate: Date }): Promise<ServiceResponse<PeakTimeAnalysis>>;
  generateTimeRecommendations(analysis: PeakTimeAnalysis): Promise<Array<{ type: string; message: string; impact: string }>>;
}

export interface IConversionTrackingService {
  createGoal(goal: Omit<ConversionGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<ConversionGoal>>;
  trackConversion(event: Omit<ConversionEvent, 'id' | 'createdAt'>): Promise<ServiceResponse<ConversionEvent>>;
  getConversionFunnel(goalId: string, timeRange?: { startDate: Date; endDate: Date }): Promise<ServiceResponse<ConversionFunnel>>;
  getConversionAnalytics(qrCodeId: string, timeRange?: { startDate: Date; endDate: Date }): Promise<ServiceResponse<ConversionAnalytics>>;
}

export interface IHeatmapService {
  generateGeographicHeatmap(qrCodeId: string, options: HeatmapOptions): Promise<ServiceResponse<GeographicHeatmap>>;
  generateTemporalHeatmap(qrCodeId: string, options: HeatmapOptions): Promise<ServiceResponse<TemporalHeatmap>>;
  generateDeviceHeatmap(qrCodeId: string, options: HeatmapOptions): Promise<ServiceResponse<HeatmapData>>;
  generateHeatmapImage(heatmapData: HeatmapData, format: 'png' | 'svg'): Promise<ServiceResponse<Buffer>>;
}

export interface IAdvancedExportService {
  exportToExcel(data: AnalyticsSummary, configuration: ExportConfiguration): Promise<ServiceResponse<ExportResult>>;
  exportToPDF(data: AnalyticsSummary, configuration: ExportConfiguration): Promise<ServiceResponse<ExportResult>>;
  exportAdvanced(data: AdvancedAnalyticsResponse, configuration: ExportConfiguration): Promise<ServiceResponse<ExportResult>>;
  generateReport(qrCodeId: string, template: string, configuration: ExportConfiguration): Promise<ServiceResponse<ExportResult>>;
}

export interface IRealTimeAnalyticsService {
  startRealTimeEngine(): Promise<ServiceResponse<void>>;
  stopRealTimeEngine(): Promise<ServiceResponse<void>>;
  getRealTimeMetrics(qrCodeId: string): Promise<ServiceResponse<RealTimeMetrics>>;
  subscribeToMetrics(connectionId: string, qrCodeIds: string[], metricTypes: string[]): Promise<ServiceResponse<void>>;
  unsubscribeFromMetrics(connectionId: string, qrCodeIds?: string[], metricTypes?: string[]): Promise<ServiceResponse<void>>;
  broadcastMetricUpdate(qrCodeId: string, metricUpdate: any): Promise<ServiceResponse<void>>;
  getAnalyticsSnapshot(qrCodeId: string): Promise<ServiceResponse<AnalyticsSnapshot>>;
  getCurrentMetrics(qrCodeId: string): Promise<ServiceResponse<RealTimeMetrics>>;
  subscribeToUpdates(connectionId: string, qrCodeIds: string[]): Promise<ServiceResponse<void>>;
  unsubscribeFromUpdates(connectionId: string, qrCodeIds?: string[]): Promise<ServiceResponse<void>>;
  broadcastUpdate(qrCodeId: string, metrics: RealTimeMetrics): Promise<ServiceResponse<void>>;
}

export interface IAlertEngineService {
  startAlertEngine(): Promise<ServiceResponse<void>>;
  stopAlertEngine(): Promise<ServiceResponse<void>>;
  createAlertRule(request: CreateAlertRuleRequest): Promise<ServiceResponse<AlertRule>>;
  updateAlertRule(alertRuleId: string, updates: UpdateAlertRuleRequest): Promise<ServiceResponse<AlertRule>>;
  deleteAlertRule(alertRuleId: string): Promise<ServiceResponse<void>>;
  evaluateMetric(context: any): Promise<ServiceResponse<AlertRuleEvaluation[]>>;
  getActiveAlerts(userId: string, filters?: { qrCodeId?: string; severity?: string }): Promise<ServiceResponse<AlertInstance[]>>;
  acknowledgeAlert(alertInstanceId: string, userId: string, notes?: string): Promise<ServiceResponse<void>>;
  resolveAlert(alertInstanceId: string, userId: string, resolutionNotes?: string): Promise<ServiceResponse<void>>;
}

export interface INotificationService {
  sendEmail(request: any): Promise<ServiceResponse<any>>;
  sendSMS(request: any): Promise<ServiceResponse<any>>;
  getNotificationStatus(messageId: string): Promise<ServiceResponse<any>>;
  getUserNotifications(userId: string, type?: 'email' | 'sms'): Promise<ServiceResponse<any[]>>;
}

// Additional Types for Advanced Features
export interface ConversionAnalytics {
  totalConversions: number;
  conversionRate: number;
  averageTimeToConversion: number;
  conversionsByGoal: Array<{
    goalId: string;
    goalName: string;
    conversions: number;
    conversionRate: number;
  }>;
  conversionTrends: Array<{
    date: string;
    conversions: number;
    conversionRate: number;
  }>;
  topConvertingSegments: Array<{
    segment: string;
    conversionRate: number;
    count: number;
  }>;
}

export interface HeatmapOptions {
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
  includeMetadata: boolean;
  minIntensity?: number;
  maxIntensity?: number;
  colorScheme?: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cool' | 'warm';
}

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

export interface ConversionGoal {
  id: string;
  qrCodeId: string;
  userId: string;
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

// Alert System Types
export interface AlertRule {
  id: string;
  userId: string;
  qrCodeId?: string;
  name: string;
  description?: string;
  ruleType: 'threshold' | 'anomaly' | 'trend' | 'custom';
  metricType: string;
  conditions: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  cooldownMinutes: number;
  aggregationWindow: number;
  notificationChannels: NotificationChannel[];
  notificationSettings: Record<string, any>;
  lastTriggered?: Date;
  triggeredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertInstance {
  id: string;
  alertRuleId: string;
  qrCodeId?: string;
  status: 'active' | 'resolved' | 'muted';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  triggerValue: number;
  thresholdValue?: number;
  metricData: Record<string, any>;
  contextData: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  mutedUntil?: Date;
  acknowledgment?: Record<string, any>;
  resolutionNotes?: string;
}

export interface AlertNotification {
  id: string;
  alertInstanceId: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
}

export interface AlertMetric {
  id: string;
  alertRuleId: string;
  dateBucket: Date;
  triggersCount: number;
  falsePositiveCount: number;
  averageResolutionTime?: number;
  notificationsSent: number;
  notificationsFailed: number;
  createdAt: Date;
}

export interface CreateAlertRuleRequest {
  userId: string;
  qrCodeId?: string;
  name: string;
  description?: string;
  ruleType: 'threshold' | 'anomaly' | 'trend' | 'custom';
  metricType: string;
  conditions: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isActive?: boolean;
  cooldownMinutes?: number;
  aggregationWindow?: number;
  notificationChannels?: NotificationChannel[];
  notificationSettings?: Record<string, any>;
}

export interface UpdateAlertRuleRequest extends Partial<CreateAlertRuleRequest> {
  id?: never; // Prevent ID updates
}

export interface AlertRuleEvaluation {
  ruleId: string;
  triggered: boolean;
  metricValue: number;
  thresholdValue?: number;
  evaluatedAt: Date;
  reason: string;
}

export type NotificationChannel = 'email' | 'sms' | 'slack' | 'webhook';

// Infrastructure Interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
}

// Common Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    [key: string]: any; // Allow additional properties
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  dependencies?: Record<string, any>;
}

// Error Classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

// Re-export services for convenience
export { AnalyticsService } from '../services/analytics.service';
export { PeakTimeAnalysisService } from '../services/peak-time-analysis.service';
export { ConversionTrackingService } from '../services/conversion-tracking.service';
export { AdvancedExportService } from '../services/advanced-export.service';
export { HeatmapService } from '../services/heatmap.service';
export { RealTimeAnalyticsService } from '../services/real-time-analytics.service';