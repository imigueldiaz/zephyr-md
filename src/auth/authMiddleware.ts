import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from './authTypes';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const loadConfig = (): string => {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return jwtSecret;
};

const jwtSecret = loadConfig();

/**
 * Middleware to verify JWT token
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication token is required' });
            return;
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
