import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token
 * @returns string A base64 encoded random token
 */
const generateToken = (): string => {
    return crypto.randomBytes(32).toString('base64');
};

/**
 * Middleware to generate CSRF token and set it in response locals
 */
export const generateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = generateToken();
    
    // Set token in cookie with security options
    res.cookie('csrf-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });

    // Make token available in templates
    res.locals.csrfToken = token;
    next();
};

/**
 * Middleware to validate CSRF token
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
    // Skip validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'] as string;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403).json({ error: 'Invalid CSRF token' });
        return;
    }

    next();
};
