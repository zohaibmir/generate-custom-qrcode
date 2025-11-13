import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // In a real implementation, this would validate JWT token
    // For now, we'll use a mock user for development
    const userId = req.headers['user-id'] as string || 'user-123';
    const userEmail = req.headers['user-email'] as string || 'user@example.com';
    
    req.user = {
        id: userId,
        email: userEmail,
        role: 'user'
    };
    
    next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
        res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
        return;
    }
    next();
};