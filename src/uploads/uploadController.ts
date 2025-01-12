import { Request, Response } from 'express';
import { isValidMarkdown } from './validators';
import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

        // Validate file content
        if (!isValidMarkdown(fileContent)) {
            res.status(400).json({ message: 'Invalid markdown file content' });
            return;
        }

        // Validate front matter
        try {
            const { data: frontMatter } = matter(fileContent);
            
            // Validate required front matter fields
            if (!frontMatter.title) {
                res.status(400).json({ message: 'Front matter must include a title' });
                return;
            }

            // Process labels if present
            if (frontMatter.labels) {
                frontMatter.labels = processLabels(frontMatter.labels);
            }

            // Parse author if present
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

            // Create filename from title
            const fileName = frontMatter.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + '.md';

            // Save file to content/posts directory
            const postsDir = path.join(process.cwd(), 'content', 'posts');
            
            // Create posts directory if it doesn't exist
            if (!fs.existsSync(postsDir)) {
                fs.mkdirSync(postsDir, { recursive: true });
            }

            const filePath = path.join(postsDir, fileName);

            fs.writeFileSync(filePath, fileContent);

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

