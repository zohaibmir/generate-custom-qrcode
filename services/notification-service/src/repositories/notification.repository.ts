import { Pool, PoolClient } from 'pg';
import { ILogger, INotificationRepository, EmailMessage, SMSMessage } from '../interfaces';
import { DatabaseError } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

export class NotificationRepository implements INotificationRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async saveEmail(email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailMessage> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO email_messages 
        (id, user_id, to_email, from_email, subject, body, template_name, template_data, status, sent_at, delivered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const id = uuidv4();
      const values = [
        id,
        null, // user_id - will be null for now, but can be populated when we have user context
        email.to,
        email.from || null,
        email.subject,
        email.body || null,
        email.template || null,
        email.templateData ? JSON.stringify(email.templateData) : null,
        email.status,
        email.sentAt || null,
        email.deliveredAt || null
      ];

      this.logger.debug('Saving email message', { 
        id, 
        to: email.to, 
        subject: email.subject,
        status: email.status 
      });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new DatabaseError('Failed to save email message - no data returned');
      }

      const savedEmail = this.mapRowToEmailMessage(result.rows[0]);
      this.logger.info('Email message saved successfully', { 
        id: savedEmail.id, 
        to: savedEmail.to,
        status: savedEmail.status 
      });
      
      return savedEmail;
      
    } catch (error: any) {
      this.logger.error('Failed to save email message', { 
        error: error.message,
        to: email.to,
        subject: email.subject 
      });
      
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(`Failed to save email message: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async saveSMS(sms: Omit<SMSMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMSMessage> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO sms_messages 
        (id, user_id, to_phone, from_phone, message, status, sent_at, delivered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const id = uuidv4();
      const values = [
        id,
        null, // user_id - will be null for now
        sms.to,
        sms.from || null,
        sms.message,
        sms.status,
        sms.sentAt || null,
        sms.deliveredAt || null
      ];

      this.logger.debug('Saving SMS message', { 
        id, 
        to: sms.to, 
        status: sms.status 
      });
      
      const result = await client.query(query, values);
      
      if (!result.rows[0]) {
        throw new DatabaseError('Failed to save SMS message - no data returned');
      }

      const savedSMS = this.mapRowToSMSMessage(result.rows[0]);
      this.logger.info('SMS message saved successfully', { 
        id: savedSMS.id, 
        to: savedSMS.to,
        status: savedSMS.status 
      });
      
      return savedSMS;
      
    } catch (error: any) {
      this.logger.error('Failed to save SMS message', { 
        error: error.message,
        to: sms.to 
      });
      
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(`Failed to save SMS message: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findEmailById(id: string): Promise<EmailMessage | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM email_messages WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToEmailMessage(result.rows[0]);
    } catch (error: any) {
      this.logger.error('Failed to find email by ID', { error: error.message, id });
      throw new DatabaseError(`Failed to find email: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findSMSById(id: string): Promise<SMSMessage | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'SELECT * FROM sms_messages WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSMSMessage(result.rows[0]);
    } catch (error: any) {
      this.logger.error('Failed to find SMS by ID', { error: error.message, id });
      throw new DatabaseError(`Failed to find SMS: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async updateEmailStatus(id: string, status: EmailMessage['status'], deliveredAt?: Date): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        UPDATE email_messages 
        SET status = $1, delivered_at = $2, updated_at = NOW()
        WHERE id = $3
      `;
      
      const values = [status, deliveredAt || null, id];
      await client.query(query, values);
      
      this.logger.info('Email status updated', { id, status, deliveredAt });
    } catch (error: any) {
      this.logger.error('Failed to update email status', { error: error.message, id, status });
      throw new DatabaseError(`Failed to update email status: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async updateSMSStatus(id: string, status: SMSMessage['status'], deliveredAt?: Date): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        UPDATE sms_messages 
        SET status = $1, delivered_at = $2, updated_at = NOW()
        WHERE id = $3
      `;
      
      const values = [status, deliveredAt || null, id];
      await client.query(query, values);
      
      this.logger.info('SMS status updated', { id, status, deliveredAt });
    } catch (error: any) {
      this.logger.error('Failed to update SMS status', { error: error.message, id, status });
      throw new DatabaseError(`Failed to update SMS status: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async getNotificationsByUserId(userId: string, type?: 'email' | 'sms'): Promise<(EmailMessage | SMSMessage)[]> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const notifications: (EmailMessage | SMSMessage)[] = [];
      
      if (!type || type === 'email') {
        const emailQuery = `
          SELECT * FROM email_messages 
          WHERE user_id = $1 
          ORDER BY created_at DESC
        `;
        const emailResult = await client.query(emailQuery, [userId]);
        const emails = emailResult.rows.map(row => this.mapRowToEmailMessage(row));
        notifications.push(...emails);
      }
      
      if (!type || type === 'sms') {
        const smsQuery = `
          SELECT * FROM sms_messages 
          WHERE user_id = $1 
          ORDER BY created_at DESC
        `;
        const smsResult = await client.query(smsQuery, [userId]);
        const smsList = smsResult.rows.map(row => this.mapRowToSMSMessage(row));
        notifications.push(...smsList);
      }
      
      // Sort by created_at descending
      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return notifications;
    } catch (error: any) {
      this.logger.error('Failed to get notifications by user ID', { error: error.message, userId, type });
      throw new DatabaseError(`Failed to get user notifications: ${error.message}`);
    } finally {
      client.release();
    }
  }

  private mapRowToEmailMessage(row: any): EmailMessage {
    return {
      id: row.id,
      to: row.to_email,
      from: row.from_email,
      subject: row.subject,
      body: row.body,
      template: row.template_name,
      templateData: row.template_data ? JSON.parse(row.template_data) : undefined,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSMSMessage(row: any): SMSMessage {
    return {
      id: row.id,
      to: row.to_phone,
      from: row.from_phone,
      message: row.message,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}