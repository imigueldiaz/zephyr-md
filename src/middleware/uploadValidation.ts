import { Request, Response, NextFunction } from 'express';
import { body, ValidationChain } from 'express-validator';
import { MAX_FILE_SIZE, MAX_TITLE_LENGTH, MAX_LABEL_LENGTH } from '../constants';
import DOMPurify from 'dompurify';
/**
 * Validation chains for markdown upload
 */
export const validateMarkdownUpload: ValidationChain[] = [
    // Validate file metadata if present in body
    body('title')
        .optional()
        .isString()
        .trim()
        .escape()
        .isLength({ max: MAX_TITLE_LENGTH })
        .withMessage(`Title must not exceed ${MAX_TITLE_LENGTH} characters`),
    
    body('labels')
        .optional()
        .custom((value) => {
            if (Array.isArray(value)) {
                return value.every(label => 
                    typeof label === 'string' && 
                    label.length <= MAX_LABEL_LENGTH
                );
            }
            return typeof value === 'string' && 
                   value.split(',')
                        .every(label => label.trim().length <= MAX_LABEL_LENGTH);
        })
        .withMessage(`Each label must not exceed ${MAX_LABEL_LENGTH} characters`),
    
    body('author')
        .optional()
        .isString()
        .trim()
        .escape(),
        
    body('date')
        .optional()
        .isISO8601()
        .toDate(),
];

/**
 * Middleware to validate file size and type before processing
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
            message: 'File too large',
            details: `Maximum file size is ${MAX_FILE_SIZE / 1024}KB`
        });
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.md')) {
        return res.status(400).json({ 
            message: 'Invalid file type',
            details: 'Only markdown (.md) files are allowed'
        });
    }

    // Validate file content early
    try {
        const fileContent = req.file.buffer.toString('utf-8');
        
        // Basic content validation
        if (fileContent.trim().length === 0) {
            return res.status(400).json({ message: 'File is empty' });
        }

        // Sanitize file content using DOMPurify
        const sanitizedContent = DOMPurify.sanitize(fileContent);

        if (sanitizedContent !== fileContent) {
            return res.status(400).json({ 
                message: 'Invalid content detected',
                details: 'File contains potentially malicious content'
            });
        }

        next();
    } catch (error) {
        return res.status(400).json({ 
            message: 'Invalid file content',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
