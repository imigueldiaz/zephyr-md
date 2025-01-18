import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';
import { escape } from 'he';
import { validationResult } from 'express-validator';

// Define secure input validation patterns
const SAFE_INPUT_PATTERNS = {
    title: /^[\w\s\-.,!?()]{1,200}$/,
    content: /^[\s\S]*$/m,
    metadata: /^[\w\s\-.,!?()]{1,500}$/
};

// Create a type-safe validator middleware
export const validateMarkdownUpload = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        next(new Error('Validation failed: ' + JSON.stringify(errors.array())));
        return;
    }

    if (!req.file || !req.file.buffer) {
        next(new Error('No file uploaded or invalid file content'));
        return;
    }

    try {
        // Get file content as string
        const content = req.file.buffer.toString('utf-8');
        
        // Pre-validate content before processing
        if (!validateContent(content)) {
            next(new Error('Invalid markdown content'));
            return;
        }

        // Store sanitized content for the next middleware
        const sanitizedContent = sanitizeContent(content);
        res.locals.sanitizedContent = sanitizedContent;
        next();
    } catch (error) {
        next(error);
    }
};

function validateContent(content: string): boolean {
    // Sanitize content using sanitize-html
    const sanitized = sanitizeHtml(content, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
        enforceHtmlBoundary: true,
        parseStyleAttributes: false
    });

    // Check if sanitized content is different from the original content
    return sanitized === content;
}

function sanitizeContent(content: string): string {
    // First pass: basic HTML entity escape
    let sanitized = escape(content);

    // Second pass: sanitize any HTML
    sanitized = sanitizeHtml(sanitized, {
        allowedTags: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'li'],
        allowedAttributes: {}, // No attributes allowed
        disallowedTagsMode: 'escape',
        enforceHtmlBoundary: true,
        parseStyleAttributes: false
    });

    // Third pass: remove potential template literals
    sanitized = sanitized.replace(/\$\{.*\}/g, '');

    return sanitized;
}

// Updated upload handler with secure processing
export async function uploadMarkdown(req: Request, res: Response): Promise<void> {
    try {
        const sanitizedContent = res.locals.sanitizedContent;
        if (!sanitizedContent) {
            throw new Error('Missing sanitized content');
        }

        // Process the sanitized content safely
        // Your existing markdown processing logic here
        
        res.json({
            status: 'success',
            message: 'File uploaded and processed successfully'
        });
    } catch (error) {
        console.error('Upload processing error:', error);
        res.status(500).json({
            error: 'Upload processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}