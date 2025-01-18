import { Request } from 'express';
import multer from 'multer';
import { MAX_FILE_SIZE } from '../constants';
import crypto from 'crypto';

// Enhanced content type validation
const ALLOWED_CONTENT_TYPES = new Set([
    'text/markdown',
    'text/x-markdown',
    'text/plain',
    'application/octet-stream'
]);

// Enhanced file name validation
const SAFE_FILENAME_PATTERN = /^[a-z0-9][a-z0-9-]*\.md$/;
const MAX_FILENAME_LENGTH = 255;

interface UploadOptions {
    maxFileSize?: number;
    maxFiles?: number;
    allowedTypes?: Set<string>;
}

// Enhanced file filter with additional security checks
const createFileFilter = (options: UploadOptions = {}) => {
    const allowedTypes = options.allowedTypes || ALLOWED_CONTENT_TYPES;

    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        try {
            // Check MIME type
            if (!allowedTypes.has(file.mimetype)) {
                return cb(new Error('Invalid file type'));
            }

            const fileName = file.originalname.toLowerCase();

            // Check file extension
            if (!fileName.endsWith('.md')) {
                return cb(new Error('File must have .md extension'));
            }

            // Check filename length
            if (fileName.length > MAX_FILENAME_LENGTH) {
                return cb(new Error('Filename is too long'));
            }

            // Check filename pattern
            if (!SAFE_FILENAME_PATTERN.test(fileName)) {
                return cb(new Error('Invalid filename format'));
            }

            // Check for potential shell metacharacters
            if (/[;&|`$]/.test(fileName)) {
                return cb(new Error('Invalid characters in filename'));
            }

            // Generate random filename if needed
            if (req.body.useRandomFilename) {
                const randomName = crypto.randomBytes(16).toString('hex');
                file.originalname = `${randomName}.md`;
            }

            cb(null, true);
        } catch (error) {
            cb(error instanceof Error ? error : new Error(String(error)));
        }
    };
};

// Enhanced storage configuration
const storage = multer.memoryStorage();

// Create upload middleware with enhanced options
export function createUploadMiddleware(options: UploadOptions = {}) {
    const uploadConfig = {
        storage,
        fileFilter: createFileFilter(options),
        limits: {
            fileSize: options.maxFileSize || MAX_FILE_SIZE,
            files: options.maxFiles || 1,
            fields: 5
        }
    };

    return multer(uploadConfig);
}

// Default upload middleware instance
export const upload = createUploadMiddleware();

// Export helper functions for testing and custom configurations
export const helpers = {
    createFileFilter,
    ALLOWED_CONTENT_TYPES,
    SAFE_FILENAME_PATTERN
};