import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApiResponse, ServiceResponse } from '@qr-saas/shared';

dotenv.config({ path: '../../.env' });

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  template?: string;
  templateData?: any;
}

interface SMSRequest {
  to: string;
  message: string;
}

// Notification service for email and SMS
class NotificationService {
  async sendEmail(emailData: EmailRequest): Promise<ServiceResponse<{ messageId: string }>> {
    try {
      // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
      const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      console.log('Email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
        messageId
      });
      
      return {
        success: true,
        data: { messageId }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send email',
          statusCode: 500
        }
      };
    }
  }

  async sendSMS(smsData: SMSRequest): Promise<ServiceResponse<{ messageId: string }>> {
    try {
      // TODO: Implement actual SMS sending (Twilio, AWS SNS, etc.)
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      console.log('SMS would be sent:', {
        to: smsData.to,
        message: smsData.message,
        messageId
      });
      
      return {
        success: true,
        data: { messageId }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SMS_SEND_FAILED',
          message: 'Failed to send SMS',
          statusCode: 500
        }
      };
    }
  }

  async getNotificationStatus(messageId: string): Promise<ServiceResponse<{ status: string; sentAt: Date }>> {
    try {
      // TODO: Implement actual status checking
      return {
        success: true,
        data: {
          status: 'delivered',
          sentAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: 'Failed to check notification status',
          statusCode: 500
        }
      };
    }
  }
}

const notificationService = new NotificationService();

app.get('/health', (req, res) => {
  const response: ApiResponse<{ status: string; service: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      service: 'notification-service',
      timestamp: new Date().toISOString()
    }
  };
  res.json(response);
});

app.post('/notifications/email', async (req, res) => {
  try {
    const { to, subject, body, template, templateData } = req.body;

    if (!to || !subject || (!body && !template)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email recipient, subject, and body/template are required'
        }
      };
      return res.status(400).json(response);
    }

    const result = await notificationService.sendEmail({
      to,
      subject,
      body,
      template,
      templateData
    });
    
    if (!result.success) {
      return res.status(result.error?.statusCode || 500).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'EMAIL_ERROR',
        message: error instanceof Error ? error.message : 'Email sending failed'
      }
    };
    res.status(500).json(response);
  }
});

app.post('/notifications/sms', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number and message are required'
        }
      };
      return res.status(400).json(response);
    }

    const result = await notificationService.sendSMS({ to, message });
    
    if (!result.success) {
      return res.status(result.error?.statusCode || 500).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SMS_ERROR',
        message: error instanceof Error ? error.message : 'SMS sending failed'
      }
    };
    res.status(500).json(response);
  }
});

app.get('/notifications/:messageId/status', async (req, res) => {
  const result = await notificationService.getNotificationStatus(req.params.messageId);
  
  if (!result.success) {
    return res.status(result.error?.statusCode || 500).json(result);
  }
  
  res.json(result);
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});