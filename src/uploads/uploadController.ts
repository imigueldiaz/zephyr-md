import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

interface Author {
    name: string;
    email?: string;
}

/**
 * Parse author string into structured format
 * Supports formats:
 * - "Name Surname"
 * - "Name Surname <email@example.com>"
 * - "Name Surname email@example.com"
 * - "Name <email@example.com>"
 */
const parseAuthor = (authorStr: string): Author => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const bracketEmailRegex = /<([^>]+)>/;

    // Check for email in brackets first
    const bracketMatch = authorStr.match(bracketEmailRegex);
    if (bracketMatch) {
        const email = bracketMatch[1];
        const name = authorStr.replace(bracketEmailRegex, '').trim();
        return { name, email };
    }

    // Check for email without brackets
    const parts = authorStr.split(' ');
    const lastPart = parts[parts.length - 1];

    if (emailRegex.test(lastPart)) {
        const name = parts.slice(0, -1).join(' ');
        return { name, email: lastPart };
    }

    // No email found, treat entire string as name
    return { name: authorStr.trim() };
};

/**
 * Process labels string into array
 * @param labels Labels string from frontmatter
 * @returns Array of labels
 */
const processLabels = (labels: string | string[]): string[] => {
    if (Array.isArray(labels)) {
        return labels;
    }
    return labels.split(',').map(label => label.trim());
};

/**
 * Controller for handling markdown file uploads
 */
export const uploadMarkdown = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request
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
        if (fileContent.length > 1024 * 1024) { // 1MB limit
            res.status(400).json({ message: 'File too large' });
            return;
        }

        // Check for potentially dangerous content
        const dangerousPatterns = [
            /<%.*%>/g,           // EJS/ASP tags
            /<\?.*\?>/g,         // PHP tags
            /\{\{.*\}\}/g,       // Handlebars/Mustache
            /<script.*>.*<\/script>/gis,  // Script tags
            /javascript:/gi,      // JavaScript protocol
            /data:/gi,           // Data URLs
            /vbscript:/gi,       // VBScript protocol
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(fileContent)) {
                res.status(400).json({ message: 'Content contains potentially dangerous patterns' });
                return;
            }
        }

        // Parse and validate markdown content
        try {
            const { content, data: frontMatter } = matter(fileContent);
            
            // Validate markdown content
            const md = new MarkdownIt('default', {
                html: true,        // Enable HTML tags
                linkify: true,      // Convert URL-like text to links
                typographer: true,  // Enable some language-neutral replacement + quotes beautification
            });

            try {
                const result = md.parse(content, {});
                if (!result || result.length === 0) {
                    res.status(400).json({ message: 'Invalid or empty markdown content' });
                    return;
                }
            } catch (error) {
                console.error('Markdown parsing error:', error);
                res.status(400).json({ message: 'Invalid markdown content' });
                return;
            }
            
            // Validate required front matter fields
            if (!frontMatter.title || typeof frontMatter.title !== 'string') {
                res.status(400).json({ message: 'Front matter must include a valid title' });
                return;
            }

            // Validate title length and characters
            if (frontMatter.title.length > 200 || !/^[\w\s\-.,!?()]+$/.test(frontMatter.title)) {
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
                        label.length <= 50 && 
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

            // Sanitize and validate filename
            const sanitizedTitle = frontMatter.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .substring(0, 100); // Limit filename length

            const fileName = sanitizedTitle + '.md';

            // Validate file extension
            if (!fileName.endsWith('.md')) {
                res.status(400).json({ message: 'Only markdown files are allowed' });
                return;
            }

            // Create and validate posts directory path
            const postsDir = path.join(process.cwd(), 'content', 'posts');
            const normalizedPostsDir = path.normalize(postsDir);
            
            // Create posts directory if it doesn't exist
            if (!fs.existsSync(normalizedPostsDir)) {
                fs.mkdirSync(normalizedPostsDir, { recursive: true });
            }

            // Validate final file path to prevent directory traversal
            const filePath = path.join(normalizedPostsDir, fileName);
            const normalizedFilePath = path.normalize(filePath);
            
            if (!normalizedFilePath.startsWith(normalizedPostsDir)) {
                res.status(400).json({ message: 'Invalid file path' });
                return;
            }

            // Sanitize file content
            const sanitizedContent = matter.stringify(
                matter(fileContent).content,
                frontMatter
            );

            await fs.promises.writeFile(normalizedFilePath, sanitizedContent, 'utf-8');

            res.json({
                message: 'File uploaded successfully',
                fileName,
                frontMatter
            });
        } catch (error) {
            console.error('Front matter validation error:', error);
            res.status(400).json({ message: 'Invalid front matter in markdown file' });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
};
