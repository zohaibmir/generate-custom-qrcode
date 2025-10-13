export type QRDataType = 
  | 'url' 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'wifi' 
  | 'vcard' 
  | 'calendar' 
  | 'location' 
  | 'payment';

export interface QRDesignConfig {
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
  logo?: {
    url: string;
    size: number;
    position: 'center' | 'corner';
  };
  pattern: 'square' | 'dots' | 'rounded' | 'diamond';
  frame?: {
    style: 'none' | 'square' | 'rounded' | 'circle';
    text?: string;
    color?: string;
  };
}

export interface QRValidityConfig {
  expiresAt?: Date;
  maxScans?: number;
  passwordHash?: string;
  validSchedule?: {
    validDays: number[];
    validHours: {
      start: string;
      end: string;
    };
    timezone: string;
  };
}

export interface QRCode {
  id: string;
  userId: string;
  shortId: string;
  name: string;
  type: QRDataType;
  content: any;
  designConfig: QRDesignConfig;
  targetUrl?: string;
  isActive: boolean;
  validityConfig?: QRValidityConfig;
  currentScans: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQRRequest {
  name: string;
  type: QRDataType;
  content: any;
  designConfig: QRDesignConfig;
  validityConfig?: QRValidityConfig;
}

export interface QRScanEvent {
  qrCodeId: string;
  ipHash?: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  country?: string;
  city?: string;
  referrer?: string;
  scannedAt: Date;
}