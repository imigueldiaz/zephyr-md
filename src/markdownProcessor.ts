import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';
import type { Renderer, Tokens } from 'marked';

interface BlogPost {
    title: string;
    date: string;
    content: string;
    excerpt: string;
    slug: string;
    language: string;
    labels: string[];
    rawLabels: string;
}

interface PostMetadata {
    title?: string;
    date?: string;
    excerpt?: string;
    language?: string;
    labels?: string;
    [key: string]: any;
}

interface GrayMatterFile {
    data: PostMetadata;
    content: string;
}

export class MarkdownProcessor {
    private contentDir: string;
    private postsDir: string;

    constructor(contentDir?: string) {
        this.contentDir = contentDir || join(__dirname, '../content');
        this.postsDir = join(this.contentDir, 'posts');

        // Configurar marked globalmente
        marked.setOptions({
            gfm: true,
            breaks: false,
            pedantic: false
        });
    }

    async getPost(slug: string): Promise<BlogPost | null> {
        try {
            console.log('Getting post with slug:', slug);
            const filePath = join(this.postsDir, `${slug}.md`);
            return await this.processMarkdownFile(filePath);
        } catch (error) {
            console.error('Error getting post:', error);
            return null;
        }
    }

    async getAllPosts(): Promise<BlogPost[]> {
        try {
            const files = await readdir(this.postsDir);
            console.log('Found post files:', files);

            const posts = await Promise.all(
                files
                    .filter(file => file.endsWith('.md'))
                    .map(async file => {
                        const slug = file.replace('.md', '');
                        return this.getPost(slug);
                    })
            );

            console.log('Processed posts:', posts);
            return posts.filter((post): post is BlogPost => post !== null);
        } catch (error) {
            console.error('Error getting all posts:', error);
            return [];
        }
    }

    async processMarkdownFile(filePath: string): Promise<BlogPost> {
        try {
            console.log('Processing markdown file:', filePath);
            const fileContent = await readFile(filePath, 'utf-8');
            const { data, content } = matter(fileContent) as GrayMatterFile;
            
            // Configurar marked para el resaltado de código
            const renderer = new marked.Renderer();
            renderer.code = function(this: Renderer, { text, lang }: Tokens.Code): string {
                const language = lang || 'plaintext';
                try {
                    if (language && hljs.getLanguage(language)) {
                        const highlighted = hljs.highlight(text, { language }).value;
                        return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
                    }
                    return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`;
                } catch (error) {
                    console.error('Error highlighting code:', error);
                    return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`;
                }
            };

            // Remove first H1 if it matches the frontmatter title
            const lines = content.split('\n');
            const titlePattern = new RegExp(`^#\\s*${data.title}\\s*$`);
            const firstH1Index = lines.findIndex(line => titlePattern.test(line));
            if (firstH1Index !== -1) {
                lines.splice(firstH1Index, 1);
            }
            const processedContent = lines.join('\n');

            // Procesar el contenido markdown a HTML
            let htmlContent = marked.parse(processedContent, { renderer });
            // Si es una Promise, esperar su resolución
            if (htmlContent instanceof Promise) {
                htmlContent = await htmlContent;
            }

            if (!htmlContent) {
                throw new Error('Failed to process markdown content');
            }

            console.log('Generated HTML sample:', htmlContent.substring(0, 500));

            // Crear el post con los metadatos y el contenido
            const post = this.processMetadata(data);
            post.content = htmlContent;
            post.slug = this.getSlugFromPath(filePath);

            return post;
        } catch (error) {
            console.error('Error processing markdown file:', filePath, error);
            throw error;
        }
    }

    private processMetadata(metadata: PostMetadata): BlogPost {
        let labels: string[] = [];
        if (metadata.labels) {
            labels = metadata.labels
                .split(',')
                .map(l => l.trim())
                .filter(l => l.length > 0);
            console.log('Processing labels:', {
                raw: metadata.labels,
                split: metadata.labels.split(','),
                trimmed: metadata.labels.split(',').map(l => l.trim()),
                filtered: labels
            });
        }

        return {
            title: metadata.title || 'Untitled',
            date: metadata.date || new Date().toISOString(),
            excerpt: metadata.excerpt || '',
            slug: '',
            language: metadata.language || '',
            labels,
            rawLabels: metadata.labels || '',
            content: ''
        };
    }

    private getSlugFromPath(filePath: string): string {
        const fileName = filePath.split(/[\/\\]/).pop() || '';
        return fileName.replace(/\.md$/, '');
    }
}
