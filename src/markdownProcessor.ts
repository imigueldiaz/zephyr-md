import { readFile, readdir } from 'fs/promises';
import { join, normalize, isAbsolute, relative } from 'path';
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
            const posts = await Promise.all(
                files
                    .filter(file => file.endsWith('.md'))
                    .map(async file => {
                        const slug = file.replace('.md', '');
                        return this.getPost(slug);
                    })
            );

            return posts.filter((post): post is BlogPost => post !== null);
        } catch (error) {
            console.error('Error getting all posts:', error);
            return [];
        }
    }

    async getPostsByTag(tag: string): Promise<BlogPost[]> {
        try {
            const allPosts = await this.getAllPosts();
            
            const filteredPosts = allPosts.filter(post => 
                post.labels && 
                post.labels.map(label => label.toLowerCase()).includes(tag.toLowerCase())
            );
            
            return filteredPosts;
        } catch (error) {
            console.error('Error getting posts by tag:', error);
            return [];
        }
    }

    private sanitizePath(filePath: string): string {
        // Normalize the path and ensure it's within contentDir
        const normalizedPath = normalize(filePath);
        const absolutePath = isAbsolute(normalizedPath) 
            ? normalizedPath 
            : join(this.contentDir, normalizedPath);
        
        // Check if the path is trying to escape contentDir
        const relativePath = relative(this.contentDir, absolutePath);
        if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
            throw new Error('Invalid file path: Attempting to access files outside content directory');
        }
        
        return absolutePath;
    }

    async processMarkdownFile(filePath: string): Promise<BlogPost> {
        try {
            // Sanitize the file path
            const safePath = this.sanitizePath(filePath);
            
            const fileContent = await readFile(safePath, 'utf-8');
            const { data, content } = matter(fileContent) as GrayMatterFile;
            
            // Configurar marked para el resaltado de código
            const renderer = new marked.Renderer();
            renderer.code = function({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }): string {
                const language = lang || 'plaintext';
                try {
                    // Split the text into lines
                    const lines = text.split('\n');
                    
                    // Create line numbers
                    const lineNumbers = lines.map((_, i) => 
                        `<span class="line-number">${i + 1}</span>`
                    ).join('');

                    // Process code lines with highlighting
                    let codeContent = text;
                    if (language && hljs.getLanguage(language)) {
                        codeContent = hljs.highlight(text, { language }).value;
                    }

                    return `
                        <div class="code-block">
                            <div class="line-numbers">${lineNumbers}</div>
                            <pre><code class="hljs language-${language}">${codeContent}</code></pre>
                        </div>`;
                } catch (error) {
                    console.error('Error highlighting code:', error);
                    return `<pre><code class="hljs">${escaped ? text : escapeHTML(text)}</code></pre>`;
                }
            };

            // Función auxiliar para escapar HTML
            function escapeHTML(text: string): string {
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

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
