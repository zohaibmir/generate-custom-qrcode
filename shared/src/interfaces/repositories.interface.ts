export interface IUserRepository {
  create(userData: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  update(id: string, userData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export interface IQRRepository {
  create(qrData: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByShortId(shortId: string): Promise<any | null>;
  findByUserId(userId: string, pagination?: any): Promise<any[]>;
  update(id: string, qrData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  incrementScanCount(id: string): Promise<void>;
}

export interface IAnalyticsRepository {
  createScanEvent(eventData: any): Promise<any>;
  getDailyAnalytics(qrCodeId: string, startDate: Date, endDate: Date): Promise<any[]>;
  getAnalyticsSummary(qrCodeId: string): Promise<any>;
}

export interface IFileRepository {
  create(fileUpload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByUserId(userId: string, options?: {
    uploadType?: string;
    mimeTypes?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: any[]; total: number }>;
  update(id: string, updates: Partial<any>): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  getStorageStats(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }>;
}