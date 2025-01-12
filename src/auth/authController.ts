import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { AuthConfig, AuthResponse, AuthUser } from './authTypes';
import fs from 'fs';
import path from 'path';

// Load users from config file
const loadConfig = (): AuthConfig => {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        const configContent = fs.readFileSync(configPath, 'utf8');
        const fullConfig = JSON.parse(configContent);
        return fullConfig.auth as AuthConfig;
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
        console.log('Login attempt:', req.body);

        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { username, password } = req.body;
        console.log('Attempting login for user:', username);

        // Verify config is loaded
        if (!config.users || !Array.isArray(config.users)) {
            console.error('Invalid users configuration');
            res.status(500).json({ message: 'Authentication system not properly configured' });
            return;
        }

        // Find user
        const user = config.users.find(u => u.username === username);
        if (!user) {
            console.log('User not found:', username);
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        console.log('User found, verifying password');

        // Verify password
        const isValid = await comparePassword(password, user.password);
        console.log('Password valid:', isValid);

        if (!isValid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken(username);

        const response: AuthResponse = {
            token,
            username
        };

        console.log('Login successful for user:', username);
        res.json(response);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
