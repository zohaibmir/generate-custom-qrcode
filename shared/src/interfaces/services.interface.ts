import { ServiceResponse } from '../types/common.types';

export interface IUserService {
  register(userData: any): Promise<ServiceResponse>;
  login(credentials: any): Promise<ServiceResponse>;
  getUserById(id: string): Promise<ServiceResponse>;
  updateUser(id: string, userData: any): Promise<ServiceResponse>;
  deleteUser(id: string): Promise<ServiceResponse>;
}

export interface IQRService {
  createQR(userId: string, qrData: any): Promise<ServiceResponse>;
  getQRById(id: string): Promise<ServiceResponse>;
  getQRByShortId(shortId: string): Promise<ServiceResponse>;
  getUserQRs(userId: string, pagination?: any): Promise<ServiceResponse>;
  updateQR(id: string, qrData: any): Promise<ServiceResponse>;
  deleteQR(id: string): Promise<ServiceResponse>;
}

export interface IAnalyticsService {
  trackScan(qrCodeId: string, scanData: any): Promise<ServiceResponse>;
  getQRAnalytics(qrCodeId: string): Promise<ServiceResponse>;
  getUserAnalytics(userId: string): Promise<ServiceResponse>;
}

export interface IFileService {
  uploadFile(request: any): Promise<ServiceResponse>;
  getFileById(fileId: string, userId?: string): Promise<any>;
  downloadFile(fileId: string, userId?: string): Promise<ServiceResponse>;
  deleteFile(fileId: string, userId: string): Promise<void>;
  listUserFiles(userId: string, page?: number, limit?: number): Promise<ServiceResponse>;
  getStorageStats(userId: string): Promise<ServiceResponse>;
  generatePresignedUrl(fileId: string, userId: string, operation?: string, expiresIn?: number): Promise<ServiceResponse>;
}

export interface INotificationService {
  sendEmail(to: string, subject: string, template: string, data: any): Promise<ServiceResponse>;
  sendWelcomeEmail(userEmail: string, userName: string): Promise<ServiceResponse>;
  sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<ServiceResponse>;
}