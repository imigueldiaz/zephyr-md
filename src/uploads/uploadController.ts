import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';

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

// Content validation patterns
const dangerousPatterns = Object.freeze([
    /<[%?].*?[%?]>/gis,    // Server-side includes
    /<!--.*?-->/gis,        // HTML comments
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis,
    /on\w+\s*=/gis,         // Event handlers
    /javascript:|data:|vbscript:|file:|blob:/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis,
    /<\/?(?:iframe|object|embed|applet|form|input|textarea|base)/gis,
]);

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

        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
            if (pattern.test(fileContent)) {
                res.status(400).json({ 
                    message: 'Content contains potentially dangerous patterns',
                    details: 'HTML, scripts, and other potentially harmful content are not allowed'
                });
                return;
            }
        }

        try {
            const { content, data: frontMatter } = matter(fileContent);
            
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
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
}
