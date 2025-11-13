import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

export const validationMiddleware = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errorDetails
            });
            return;
        }
        
        req.body = value;
        next();
    };
};

// Common validation schemas
export const alertRuleSchema = Joi.object({
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().optional().max(500),
    metric_name: Joi.string().required(),
    condition_type: Joi.string().valid('threshold', 'anomaly', 'trend').required(),
    condition_params: Joi.object().required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    notification_channels: Joi.array().items(Joi.string()).min(1).required(),
    is_active: Joi.boolean().optional().default(true),
    cooldown_period: Joi.number().integer().min(300).optional().default(900), // 15 minutes default
    qr_code_id: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
});

export const alertRuleUpdateSchema = Joi.object({
    name: Joi.string().optional().min(3).max(100),
    description: Joi.string().optional().max(500),
    condition_params: Joi.object().optional(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    notification_channels: Joi.array().items(Joi.string()).min(1).optional(),
    is_active: Joi.boolean().optional(),
    cooldown_period: Joi.number().integer().min(300).optional(),
    tags: Joi.array().items(Joi.string()).optional()
});