import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import DOMPurify from 'dompurify';
import sanitizeHtml from 'sanitize-html';
import { parse, isValid } from 'date-fns';
import { es, enUS, fr } from 'date-fns/locale';
import { createHash } from 'crypto';
import { safeMarkdown, PRECOMPILED_PATTERNS } from '../utils/markdownConfig';
import { 
    ALLOWED_HTML_TAGS, 
    ALLOWED_HTML_ATTRS, 
    SAFE_TARGET_VALUES,
    ALLOWED_PROTOCOLS,
    MAX_FILE_SIZE,
    MAX_TITLE_LENGTH,
    MAX_LABEL_LENGTH
} from '../constants';
import { MarkdownProcessor } from '../markdownProcessor';
import { BlogPost } from '../types';

// Enhanced interfaces
interface Author {
    name: string;
    email?: string;
    url?: string;
}

interface ExtendedPostMetadata {
    title: string;
    date: string;
    author?: Author;
    labels?: string[];
    description?: string;
    draft?: boolean;
}

interface UploadError extends Error {
    code: string;
    details?: any;
}

// Type definition for front matter constraints
interface ConstraintConfig {
    maxLength?: number;
    pattern?: RegExp;
    validate?: (value: any) => boolean;
    optional?: boolean;
}

interface FrontMatterConstraints {
    [key: string]: {
        maxLength?: number;
        pattern?: RegExp;
        validate?: (value: any) => boolean;
        optional?: boolean;
    } | {
        [subKey: string]: ConstraintConfig;
    };
}

// Custom error classes
class ValidationError extends Error implements UploadError {
    code: string;
    details?: any;
    constructor(message: string, details?: any) {
        super(message);
        this.name = 'ValidationError';
        this.code = 'VALIDATION_ERROR';
        this.details = details;
    }
}

class ContentError extends Error implements UploadError {
    code: string;
    details?: any;
    constructor(message: string, details?: any) {
        super(message);
        this.name = 'ContentError';
        this.code = 'CONTENT_ERROR';
        this.details = details;
    }
}

// Enhanced security patterns
const DANGEROUS_MARKDOWN_PATTERNS = [
    /\[.*\]\(.*(javascript|data|vbscript|file):.+\)/i,
    /\[.*\]\(.*(&#|%26|%23).+\)/i,
    /^(`{3,}|~{3,})(\{.*\})?[\s\S]*\1/gm,
    /<(script|iframe|object|embed|form|input|textarea|frame|meta|svg)[\s>]/gi,
    /on\w+\s*=\s*['"]/gi,
    /url\s*\(\s*['"]?\s*data:/gi
];

// Front matter constraints with proper typing
const FRONT_MATTER_CONSTRAINTS: FrontMatterConstraints = {
    title: {
        maxLength: MAX_TITLE_LENGTH,
        pattern: /^[\w\s\-.,!?()]+$/
    },
    date: {
        validate: (value: string): boolean => {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }
    },
    author: {
        name: {
            maxLength: 100,
            pattern: /^[\w\s\-.,]+$/
        },
        email: {
            optional: true,
            pattern: /^[^@]+@[^@]+\.[^@]+$/
        },
        url: {
            optional: true,
            pattern: /^https?:\/\/[\w\-.]+(:\d+)?([\/\w\-.]*)*$/
        }
    },
    labels: {
        validate: (value: string[]): boolean => {
            return value.every(label => 
                label.length <= MAX_LABEL_LENGTH && 
                /^[\w\-\s]+$/.test(label)
            );
        }
    }
};

// Content sanitization function
function sanitizeContent(content: string): string {
    const sanitizeConfig = {
        allowedTags: ALLOWED_HTML_TAGS,
        allowedAttributes: {
            a: ALLOWED_HTML_ATTRS
        },
        allowedSchemes: ALLOWED_PROTOCOLS,
        allowedSchemesByTag: {
            a: ALLOWED_PROTOCOLS
        }
    };

    return sanitizeHtml(content, sanitizeConfig);
}

// Enhanced content validation
async function validateMarkdownContent(content: string): Promise<void> {
    if (content.length > MAX_FILE_SIZE) {
        throw new ValidationError('Content exceeds maximum size');
    }

    for (const pattern of DANGEROUS_MARKDOWN_PATTERNS) {
        if (pattern.test(content)) {
            throw new ValidationError('Potentially dangerous content detected', {
                pattern: pattern.toString()
            });
        }
    }

    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    for (const block of codeBlocks) {
        if (block.length > 10000) {
            throw new ValidationError('Code block exceeds maximum length');
        }
    }
}

// Enhanced front matter validation
async function validateFrontMatter(data: Partial<ExtendedPostMetadata>): Promise<void> {
    if (!data.title || typeof data.title !== 'string') {
        throw new ValidationError('Title is required and must be a string');
    }

    for (const [key, value] of Object.entries(data)) {
        const constraint = FRONT_MATTER_CONSTRAINTS[key];
        if (!constraint) continue;

        if (typeof value === 'string') {
            if ('maxLength' in constraint && typeof constraint.maxLength === 'number' && value.length > constraint.maxLength) {
                throw new ValidationError(`${key} exceeds maximum length`);
            }

            if ('pattern' in constraint && constraint.pattern instanceof RegExp && !constraint.pattern.test(value)) {
                throw new ValidationError(`${key} contains invalid characters`);
            }
        }

        if ('validate' in constraint && typeof constraint.validate === 'function' && !constraint.validate(value)) {
            throw new ValidationError(`${key} validation failed`);
        }
    }

    if (data.author) {
        const author = typeof data.author === 'string' ? 
            parseAuthor(data.author) : data.author;
        validateAuthor(author);
    }
}

// Enhanced author parsing
function parseAuthor(author: string): Author {
    const authorRegex = /^([^<(]+)(?:\s*<([^>]+)>)?(?:\s*\(([^)]+)\))?$/;
    const match = author.trim().match(authorRegex);

    if (!match) {
        throw new ValidationError('Invalid author format');
    }

    const [, name, email, url] = match;
    return {
        name: name.trim(),
        ...(email && { email: email.trim() }),
        ...(url && { url: url.trim() })
    };
}

function validateAuthor(author: Author): void {
    const authorConstraints = FRONT_MATTER_CONSTRAINTS.author as Record<string, ConstraintConfig>;
    
    if (!author.name || !authorConstraints.name.pattern?.test(author.name)) {
        throw new ValidationError('Invalid author name');
    }

    if (author.email && !authorConstraints.email.pattern?.test(author.email)) {
        throw new ValidationError('Invalid author email');
    }

    if (author.url && !authorConstraints.url.pattern?.test(author.url)) {
        throw new ValidationError('Invalid author URL');
    }
}

// Enhanced error handling
function handleUploadError(error: Error, res: Response): void {
    const uploadError = error as UploadError;
    
    console.error('Upload error:', {
        code: uploadError.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: (uploadError as any).details,
        stack: error.stack
    });

    const errorResponse = {
        status: 'error',
        code: uploadError.code || 'UNKNOWN_ERROR',
        message: error.message
    };

    switch (uploadError.code) {
        case 'VALIDATION_ERROR':
            res.status(400).json(errorResponse);
            break;
        case 'CONTENT_ERROR':
            res.status(422).json(errorResponse);
            break;
        case 'LIMIT_FILE_SIZE':
            res.status(413).json(errorResponse);
            break;
        default:
            res.status(500).json({
                status: 'error',
                code: 'INTERNAL_ERROR',
                message: 'Internal server error'
            });
    }
}

// Enhanced file processing
async function processMarkdownSafely(rawContent: string): Promise<{ frontMatter: ExtendedPostMetadata; content: string }> {
    await validateMarkdownContent(rawContent);
    const sanitizedContent = sanitizeContent(rawContent);
    const parsed = matter(sanitizedContent);
    
    // Cast the data to ExtendedPostMetadata and validate
    const frontMatter = parsed.data as ExtendedPostMetadata;
    await validateFrontMatter(frontMatter);
    
    return {
        frontMatter,
        content: sanitizedContent
    };
}

// Main upload handler
export async function uploadMarkdown(req: Request, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ValidationError('Invalid request', errors.array());
        }

        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        const rawContent = req.file.buffer.toString('utf-8');
        const { frontMatter, content } = await processMarkdownSafely(rawContent);

        const secureTitle = frontMatter.title
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100);

        const fileHash = createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 8);

        const fileName = `${secureTitle}-${fileHash}.md`;

        const postsDir = path.join(process.cwd(), 'content', 'posts');
        await fs.mkdir(postsDir, { recursive: true });

        try {
            const filePath = path.join(postsDir, fileName);
            const finalContent = matter.stringify(content, frontMatter);
            
            await fs.writeFile(filePath, finalContent, { 
                encoding: 'utf-8',
                flag: 'wx' // Fail if file exists
            });

            res.json({
                status: 'success',
                message: 'File uploaded successfully',
                fileName,
                fileHash,
                frontMatter
            });

        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === 'EEXIST') {
                throw new ValidationError('File already exists');
            }
            throw error;
        }

    } catch (error) {
        handleUploadError(error instanceof Error ? error : new Error('Unknown error'), res);
    }
}