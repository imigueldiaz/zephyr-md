import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';
import { BlogPost, PostMetadata, GrayMatterFile } from './types';
import hljs from 'highlight.js';

// Extender las opciones de marked para incluir todas las propiedades necesarias
declare module 'marked' {
    interface MarkedOptions {
        highlight?: (code: string, lang: string) => string;
        langPrefix?: string;
        breaks?: boolean;
        gfm?: boolean;
        headerIds?: boolean;
        mangle?: boolean;
        pedantic?: boolean;
        sanitize?: boolean;
    }
}

export class MarkdownProcessor {
    private contentDir: string;
    private postsDir: string;

    constructor(contentDir?: string) {
        this.contentDir = contentDir || join(__dirname, '../content');
        this.postsDir = join(this.contentDir, 'posts');

        // Configurar marked para usar highlight.js y otras opciones
        marked.setOptions({
            highlight: (code: string, lang: string) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { 
                            language: lang,
                            ignoreIllegals: true 
                        }).value;
                    } catch (e) {
                        console.error('Error highlighting code:', e);
                    }
                }
                return hljs.highlightAuto(code).value;
            },
            langPrefix: 'hljs language-',
            breaks: false,         // Los párrafos se separan por líneas en blanco
            gfm: true,             // GitHub Flavored Markdown
            headerIds: true,       // Añade IDs a los encabezados
            mangle: false,         // No modifica los IDs de los encabezados
            pedantic: false,       // No es estricto con el markdown original
            sanitize: false        // Permite HTML en el input
        });
    }

    async getPost(slug: string): Promise<BlogPost | null> {
        try {
            const posts = await this.getAllPosts();
            return posts.find(post => post.slug === slug) || null;
        } catch (error) {
            console.error(`Error getting post ${slug}:`, error);
            return null;
        }
    }

    private parseMarkdown(content: string): string {
        return marked.parse(content, { async: false }) as string;
    }

    async getAllPosts(): Promise<BlogPost[]> {
        try {
            const files = await readdir(this.postsDir);
            const markdownFiles = files.filter(file => file.endsWith('.md'));

            const posts = await Promise.all(
                markdownFiles.map(async file => {
                    const filePath = join(this.postsDir, file);
                    const content = await readFile(filePath, 'utf-8');
                    const result = matter(content) as GrayMatterFile<PostMetadata>;

                    if (!result.data.title || !result.data.date) {
                        throw new Error(`Missing required frontmatter in ${file}`);
                    }

                    // Usar el método parseMarkdown que garantiza devolver una string
                    const htmlContent = this.parseMarkdown(result.content);
                    const slug = file.replace('.md', '');

                    return {
                        title: result.data.title,
                        date: result.data.date,
                        content: htmlContent,
                        excerpt: result.data.excerpt,
                        slug
                    };
                })
            );

            return posts.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
        } catch (error) {
            console.error('Error getting posts:', error);
            return [];
        }
    }
}
