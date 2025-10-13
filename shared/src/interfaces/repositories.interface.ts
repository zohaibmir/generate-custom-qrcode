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
  save(fileData: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  delete(id: string): Promise<boolean>;
}