import * as crypto from 'crypto';
import { WinstonLogger } from '../utils/logger';

export interface EncryptionConfig {
  algorithm: string;
  key: string;
  ivLength: number;
}

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  tag: string;
}

export class EncryptionService {
  private config: EncryptionConfig;
  private logger: WinstonLogger;

  constructor(logger?: WinstonLogger) {
    this.logger = logger || new WinstonLogger();
    
    this.config = {
      algorithm: 'aes-256-cbc',
      key: process.env.ENCRYPTION_KEY || this.generateKey(),
      ivLength: 16
    };

    if (!process.env.ENCRYPTION_KEY) {
      this.logger.warn('No ENCRYPTION_KEY environment variable set, using generated key');
    }
  }

  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public encrypt(text: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, Buffer.from(this.config.key, 'hex'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encryptedText: encrypted,
        iv: iv.toString('hex'),
        tag: ''
      };
    } catch (error) {
      this.logger.error('Encryption failed', { error });
      throw new Error('Failed to encrypt data');
    }
  }

  public decrypt(encryptedData: EncryptedData): string {
    try {
      const { encryptedText, iv } = encryptedData;
      
      const decipher = crypto.createDecipher(this.config.algorithm, Buffer.from(this.config.key, 'hex'));

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', { error });
      throw new Error('Failed to decrypt data');
    }
  }

  public encryptApiKey(apiKey: string): string {
    const encrypted = this.encrypt(apiKey);
    return JSON.stringify(encrypted);
  }

  public decryptApiKey(encryptedApiKey: string): string {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedApiKey);
      return this.decrypt(encryptedData);
    } catch (error) {
      this.logger.error('API key decryption failed', { error });
      throw new Error('Failed to decrypt API key');
    }
  }

  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
    
    return {
      hash,
      salt: actualSalt
    };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  public createHmac(data: string, secret?: string): string {
    const actualSecret = secret || this.config.key;
    return crypto.createHmac('sha256', actualSecret).update(data).digest('hex');
  }

  public verifyHmac(data: string, signature: string, secret?: string): boolean {
    const actualSecret = secret || this.config.key;
    const expectedSignature = this.createHmac(data, actualSecret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  // Method for securely storing sensitive inventory credentials
  public encryptCredentials(credentials: Record<string, any>): string {
    const credentialsString = JSON.stringify(credentials);
    const encrypted = this.encrypt(credentialsString);
    return JSON.stringify(encrypted);
  }

  public decryptCredentials(encryptedCredentials: string): Record<string, any> {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedCredentials);
      const decryptedString = this.decrypt(encryptedData);
      return JSON.parse(decryptedString);
    } catch (error) {
      this.logger.error('Credentials decryption failed', { error });
      throw new Error('Failed to decrypt credentials');
    }
  }
}