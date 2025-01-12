import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';
import { parse, isValid } from 'date-fns';
import { es, enUS, fr } from 'date-fns/locale';

interface Author {
    name: string;
    email?: string;
    url?: string;
}

// Constants for security limits
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_TITLE_LENGTH = 200;
const MAX_LABEL_LENGTH = 50;
const ALLOWED_CHARS_PATTERN = /^[\w\s\-.,!?()]+$/;
const SAFE_FILENAME_PATTERN = /^[a-z0-9-]+\.md$/;

// Secure file path creation
const getSecurePath = (baseDir: string, fileName: string): string => {
    const normalizedBase = path.normalize(baseDir);
    const secureFileName = path.basename(fileName);
    const fullPath = path.join(normalizedBase, secureFileName);
    const normalizedPath = path.normalize(fullPath);

    // Ensure the path is within the base directory
    if (!normalizedPath.startsWith(normalizedBase)) {
        throw new Error('Path traversal attempt detected');
    }

    return normalizedPath;
};

// HTML Tag patterns for security validation
const DANGEROUS_HTML_PATTERNS = Object.freeze([
    // Match any HTML comments with more robust pattern
    /<!--[\s\S]*?-->/gi,
    
    // Match script tags with better nesting handling
    /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
    
    // Match style tags
    /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,
    
    // Match potentially dangerous tags (self-closing or with content)
    /<(iframe|object|embed|form|input|textarea|frame|frameset|applet|meta|base|link|svg)\b[^>]*>[\s\S]*?(?:<\/\1\s*>)?/gi,
    
    // Match on* event handlers
    /\bon[a-z]+\s*=\s*["']?[^"'\s>]+/gi,
    
    // Match dangerous protocols in attributes
    /(?:javascript|data|vbscript|file|blob):/gi,
    
    // Match potentially dangerous attributes
    /\b(?:eval|setTimeout|setInterval|Function|execScript)\s*\(/gi,
    
    // Match src/href with javascript
    /(?:src|href)\s*=\s*["']?\s*javascript:/gi,
    
    // Match expression(...) in style attributes
    /expression\s*\([^)]*\)/gi,
    
    // Match behavior property in style
    /behavior\s*:\s*[^;]*/gi,
    
    // Match -moz-binding in style
    /-moz-binding\s*:\s*[^;]*/gi,

    // Server-side includes
    /<!--#(?:include|exec|echo|config|fsize|flastmod|printenv)\b[^>]*-->/gi
]);

// Safe inline styles pattern
const SAFE_STYLE_PATTERN = /^(?:\s*(?:color|background-color|font-size|font-weight|text-align|margin|padding|border|width|height|display|float|clear|overflow|visibility|position|top|right|bottom|left|z-index|opacity)\s*:\s*[^;]*;\s*)*$/i;

/**
 * Validate content against dangerous HTML patterns
 * @throws {Error} If dangerous HTML is detected
 */
function validateAgainstDangerousHTML(content: string): void {
    for (const pattern of DANGEROUS_HTML_PATTERNS) {
        if (pattern.test(content)) {
            const match = content.match(pattern);
            throw new Error(`Dangerous HTML pattern detected: ${match ? match[0].substring(0, 50) : 'unknown pattern'}`);
        }
    }
}

/**
 * Validate style attribute content
 * @throws {Error} If unsafe style is detected
 */
function validateStyle(style: string): void {
    if (!SAFE_STYLE_PATTERN.test(style)) {
        throw new Error('Unsafe style attributes detected');
    }
}

// Markdown configuration
const mdConfig = Object.freeze({
    html: false,
    linkify: true,
    typographer: true,
    maxNesting: 20
});

// Sanitization configuration
const sanitizeConfig = Object.freeze({
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'ul', 'ol', 'li', 'blockquote',
        'pre', 'code', 'em', 'strong', 'a', 'img',
        'hr', 'br'
    ],
    allowedAttributes: {
        'a': ['href'],
        'img': ['src', 'alt']
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
        img: ['http', 'https'],
        a: ['http', 'https']
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false
});

// Validation patterns for front matter
const SAFE_FRONTMATTER_PATTERNS = Object.freeze({
    title: /^[\w\s\-.,!?()]{1,200}$/,
    author: /^[\w\s\-.,@<>()]{1,100}$/,
    labels: /^[\w\s\-,]{1,500}$/,
    description: /^[\w\s\-.,!?()]{1,500}$/
});

// Supported date formats and their locales
const DATE_FORMATS = Object.freeze([
    // ISO formats
    'yyyy-MM-dd',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
    
    // Spanish formats
    'dd/MM/yyyy',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    
    // English formats
    'MM/dd/yyyy',
    'MM/dd/yyyy HH:mm',
    'MM/dd/yyyy HH:mm:ss',
    'MMMM do, yyyy',
    'MMMM do, yyyy HH:mm',
    
    // French formats
    'dd.MM.yyyy',
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy HH:mm:ss',
    
    // Common formats
    'dd-MM-yyyy',
    'yyyy.MM.dd',
    'yyyy/MM/dd'
]);

// Locales for date parsing
const SUPPORTED_LOCALES = Object.freeze({
    es,
    enUS,
    fr
});

/**
 * Try to parse a date string using multiple formats and locales
 * @param dateStr Date string to parse
 * @returns Valid Date object or null if parsing fails
 */
function tryParseDate(dateStr: string): Date | null {
    for (const locale of Object.values(SUPPORTED_LOCALES)) {
        for (const format of DATE_FORMATS) {
            try {
                const parsedDate = parse(dateStr, format, new Date(), { locale });
                if (isValid(parsedDate)) {
                    return parsedDate;
                }
            } catch {
                continue;
            }
        }
    }
    return null;
}

// Safe front matter keys
const ALLOWED_FRONTMATTER_KEYS = new Set([
    'title',
    'date',
    'author',
    'labels',
    'description',
    'draft'
]);

/**
 * Validate and sanitize front matter content
 * @throws {Error} If front matter contains invalid or dangerous content
 */
function validateFrontMatter(data: Record<string, unknown>): void {
    // Check for unknown keys
    const keys = Object.keys(data);
    for (const key of keys) {
        if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
            throw new Error(`Invalid front matter key: ${key}`);
        }
    }

    // Validate each allowed field
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;

        // Special handling for boolean draft field
        if (key === 'draft') {
            if (typeof value !== 'boolean') {
                throw new Error('Draft field must be a boolean');
            }
            continue;
        }

        // Special handling for date field
        if (key === 'date') {
            const dateStr = String(value);
            const parsedDate = tryParseDate(dateStr);
            if (!parsedDate) {
                throw new Error('Invalid date format. Please use a recognized date format');
            }
            // Normalize date to ISO format
            data[key] = parsedDate.toISOString();
            continue;
        }

        // Convert value to string for validation
        const strValue = Array.isArray(value) ? value.join(',') : String(value);
        
        // Validate against pattern
        const pattern = SAFE_FRONTMATTER_PATTERNS[key as keyof typeof SAFE_FRONTMATTER_PATTERNS];
        if (pattern && !pattern.test(strValue)) {
            throw new Error(`Invalid ${key} format in front matter`);
        }
    }
}

/**
 * Parse author string into structured format
 * Supports formats:
 * - "John Doe"
 * - "John Doe <john@example.com>"
 * - "John Doe <john@example.com> (https://example.com)"
 */
function parseAuthor(author: string | Author): Author {
    if (typeof author !== 'string') {
        return author;
    }

    const authorRegex = /^([^<(]+)(?:\s*<([^>]+)>)?(?:\s*\(([^)]+)\))?$/;
    const match = author.trim().match(authorRegex);

    if (!match) {
        throw new Error('Invalid author format');
    }

    const [, name, email, url] = match;
    return {
        name: name.trim(),
        ...(email && { email: email.trim() }),
        ...(url && { url: url.trim() })
    };
}

/**
 * Process labels into a standardized format
 */
function processLabels(labels: string | string[]): string[] {
    if (typeof labels === 'string') {
        return labels.split(',').map(label => label.trim());
    }
    return labels.map(label => label.trim());
}

/**
 * Upload and process markdown file
 */
export async function uploadMarkdown(req: Request, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const fileContent = req.file.buffer.toString('utf-8');

        // Basic content validation
        if (fileContent.length > MAX_FILE_SIZE) {
            res.status(400).json({ 
                message: 'File too large',
                details: `Maximum file size is ${MAX_FILE_SIZE / 1024}KB`
            });
            return;
        }

        // Pre-validate content for dangerous HTML
        try {
            validateAgainstDangerousHTML(fileContent);
        } catch (err) {
            if (err instanceof Error) {
                res.status(400).json({
                    message: 'Content contains dangerous HTML',
                    details: err.message
                });
                return;
            }
            throw err;
        }

        // Pre-validate front matter before parsing
        const preCheck = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (preCheck) {
            const rawFrontMatter = preCheck[1];
            try {
                validateAgainstDangerousHTML(rawFrontMatter);
            } catch (err) {
                if (err instanceof Error) {
                    res.status(400).json({
                        message: 'Front matter contains dangerous HTML',
                        details: err.message
                    });
                    return;
                }
                throw err;
            }
        }

        // Parse with gray-matter after pre-validation
        const { content, data: frontMatter } = matter(fileContent);
        
        // Validate front matter structure and content
        try {
            validateFrontMatter(frontMatter);
        } catch (err) {
            if (err instanceof Error) {
                res.status(400).json({
                    message: 'Invalid front matter',
                    details: err.message
                });
                return;
            }
            throw err;
        }

        // Create hash of content for integrity check
        const contentHash = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');

        // Validate markdown content
        const md = new MarkdownIt('zero', mdConfig);

        // Add only safe markdown features
        md.enable([
            'heading',
            'lheading',
            'paragraph',
            'blockquote',
            'list',
            'bullet',
            'reference',
            'emphasis',
            'link',
            'image',
            'code',
            'fence',
            'hr',
            'softbreak',
            'hardbreak'
        ]);

        const result = md.parse(content, {});
        if (!result || result.length === 0) {
            res.status(400).json({ 
                message: 'Invalid or empty markdown content'
            });
            return;
        }

        // Additional sanitization of rendered content
        const renderedContent = md.render(content);
        const sanitizedHtml = sanitizeHtml(renderedContent, sanitizeConfig);

        // Verify content integrity after sanitization
        if (sanitizedHtml.length < renderedContent.length * 0.8) {
            res.status(400).json({ 
                message: 'Content contains too many unsafe elements',
                details: 'Please remove HTML and ensure content is primarily markdown'
            });
            return;
        }

        // Validate required front matter fields
        if (!frontMatter.title || typeof frontMatter.title !== 'string') {
            res.status(400).json({ message: 'Front matter must include a valid title' });
            return;
        }

        // Validate title length and characters
        if (frontMatter.title.length > MAX_TITLE_LENGTH || !ALLOWED_CHARS_PATTERN.test(frontMatter.title)) {
            res.status(400).json({ message: 'Invalid title format or length' });
            return;
        }

        // Process and validate labels if present
        if (frontMatter.labels) {
            if (typeof frontMatter.labels !== 'string' && !Array.isArray(frontMatter.labels)) {
                res.status(400).json({ message: 'Labels must be a string or array' });
                return;
            }
            try {
                frontMatter.labels = processLabels(frontMatter.labels);
                // Validate each label
                if (!frontMatter.labels.every((label: string) => 
                    typeof label === 'string' && 
                    label.length <= MAX_LABEL_LENGTH && 
                    /^[\w\-\s]+$/.test(label)
                )) {
                    res.status(400).json({ message: 'Invalid label format' });
                    return;
                }
            } catch (error) {
                res.status(400).json({ message: 'Error processing labels' });
                return;
            }
        }

        // Parse and validate author if present
        if (frontMatter.author) {
            try {
                const authorData = parseAuthor(frontMatter.author);
                frontMatter.author = authorData;
            } catch (error) {
                console.error('Error parsing author:', error);
                res.status(400).json({ message: 'Invalid author format in front matter' });
                return;
            }
        }

        // Generate secure filename
        const secureTitle = frontMatter.title
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100);

        const fileName = `${secureTitle}-${contentHash.substring(0, 8)}.md`;

        if (!SAFE_FILENAME_PATTERN.test(fileName)) {
            res.status(400).json({ 
                message: 'Invalid filename generated'
            });
            return;
        }

        // Secure path handling
        const postsDir = path.join(process.cwd(), 'content', 'posts');
        await fs.mkdir(postsDir, { recursive: true });

        try {
            const filePath = getSecurePath(postsDir, fileName);
            const sanitizedContent = matter.stringify(content, frontMatter);
            await fs.writeFile(filePath, sanitizedContent, { 
                encoding: 'utf-8',
                flag: 'wx' // Fail if file exists
            });

            res.json({
                message: 'File uploaded successfully',
                fileName,
                contentHash,
                frontMatter
            });
            return;
        } catch (err) {
            if (err instanceof Error && err.message.includes('EEXIST')) {
                res.status(409).json({ 
                    message: 'File already exists'
                });
                return;
            }
            throw err;
        }
    } catch (err) {
        console.error('Error processing markdown:', err);
        res.status(500).json({ 
            message: 'Internal server error processing markdown'
        });
        return;
    }
}
