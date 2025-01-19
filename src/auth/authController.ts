import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { AuthConfig, AuthResponse, AuthUser } from './authTypes';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TemplateEngine } from '../templateEngine';
import { Config } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const getRequiredEnvVar = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} environment variable is required`);
    }
    return value;
};

// Load config file
const loadConfig = (): AuthConfig => {
    try {
        const configPath = join(process.cwd(), 'config.json');
        const configContent = readFileSync(configPath, 'utf8');
        const fullConfig = JSON.parse(configContent);
        
        // Get required environment variables
        const jwtSecret = getRequiredEnvVar('JWT_SECRET');
        const adminPasswordHash = getRequiredEnvVar('ADMIN_PASSWORD_HASH');
        
        return {
            ...fullConfig.auth as AuthConfig,
            jwtSecret,
            users: [{
                username: process.env.ADMIN_USERNAME || 'admin',
                password: adminPasswordHash
            }]
        };
    } catch (error) {
        console.error('Error loading config:', error);
        throw new Error('Failed to load authentication configuration');
    }
};

const config = loadConfig();

/**
 * Validation rules for login request
 */
export const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').trim().notEmpty().withMessage('Password is required'),
];

/**
 * Hash password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns Boolean indicating if password matches
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param username Username to include in token
 * @returns JWT token
 */
export const generateToken = (username: string): string => {
    if (!config.jwtSecret) {
        throw new Error('JWT secret is not configured');
    }
    return jwt.sign(
        { username },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

/**
 * Login controller
 * @param req Express request
 * @param res Express response
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {

        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { username, password } = req.body;

        // Verify config is loaded
        if (!config.users || !Array.isArray(config.users)) {
            console.error('Invalid users configuration');
            res.status(500).json({ message: 'Authentication system not properly configured' });
            return;
        }

        // Find user
        const user = config.users.find(u => u.username === username);
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken(username);

        // Set secure cookie with JWT token
        res.cookie('jwt', token, {
            httpOnly: true, // Prevents client-side access
            secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
            sameSite: 'strict', // Protects against CSRF
            path: '/', // Restrict to root path
            maxAge: parseInt(process.env.JWT_EXPIRY || '86400000'), // 24 hours by default
            domain: process.env.COOKIE_DOMAIN || undefined // Restrict to specific domain if set
        });

        const response: AuthResponse = {
            token,
            username
        };

        res.json(response);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Render login form
 */
export const renderLoginForm = async (req: Request, res: Response): Promise<void> => {
    try {
        const engine = new TemplateEngine(req.app.locals.config as Config);
        const html = await engine.renderTemplate('login', {});
        res.send(html);
    } catch (error) {
        console.error('Error rendering login form:', error);
        res.status(500).send('Error rendering login form');
    }
};
