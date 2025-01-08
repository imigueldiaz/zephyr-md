import { readFile } from 'fs/promises';
import { join } from 'path';
import { format, parse } from 'date-fns';
import { BlogPost } from './types';

interface SiteConfig {
    site: {
        title: string;
        description: string;
        author: {
            name: string;
            email: string;
            url: string;
        };
        social: {
            github: string;
            twitter: string;
        };
    };
    blog: {
        postsPerPage: number;
        dateFormat: string;
        license: {
            name: string;
            url: string;
        };
    };
    theme: {
        defaultMode: string;
        accentColor: string;
    };
}

interface TemplateData {
    [key: string]: any;
}

export class TemplateEngine {
    private config!: SiteConfig;
    private templates: Map<string, string> = new Map();
    private cssFiles: Set<string> = new Set();
    private readonly defaultDateFormat = 'dd/MM/yyyy HH:mm';

    constructor() {
        this.loadConfig().catch(error => {
            console.error('Failed to load config:', error);
            throw error;
        });
        this.addCssFile('base.css');
        this.addCssFile('code.css');
    }

    private async loadConfig(): Promise<void> {
        try {
            const configPath = join(__dirname, '../config.json');
            const configContent = await readFile(configPath, 'utf-8');
            this.config = JSON.parse(configContent);
            console.log(this.config);
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    async loadTemplate(name: string): Promise<string> {
        if (this.templates.has(name)) {
            return this.templates.get(name)!;
        }

        const templatePath = join(__dirname, '../templates', `${name}.html`);
        try {
            const template = await readFile(templatePath, 'utf-8');
            this.templates.set(name, template);
            return template;
        } catch (error) {
            console.error(`Error loading template ${name}:`, error);
            throw error;
        }
    }

    addCssFile(filename: string): void {
        this.cssFiles.add(filename);
    }

    private generateCssLinks(): string {
        return Array.from(this.cssFiles)
            .map(file => `<link rel="stylesheet" href="/css/${file}">`)
            .join('\n    ');
    }

    private getCommonData(): TemplateData {
        return {
            year: new Date().getFullYear(),
            styles: this.generateCssLinks(),
            siteTitle: this.config?.site.title || 'Zephyr MD',
            siteDescription: this.config?.site.description || '',
            author: this.config?.site.author || {},
            site: this.config?.site || {},
            blog: this.config?.blog || {},
            theme: this.config?.theme || {}
        };
    }

    private formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const dateFormat = this.config?.blog?.dateFormat || this.defaultDateFormat;
        try {
            return format(dateObj, dateFormat);
        } catch (error) {
            console.error(`Error formatting date with format ${dateFormat}:`, error);
            return format(dateObj, this.defaultDateFormat);
        }
    }

    private getNestedValue(obj: any, path: string): any {
        // Si es una fecha y el path termina en '_formatted', formateamos la fecha
        if (path.endsWith('_formatted')) {
            const datePath = path.replace('_formatted', '');
            const dateValue = this.getNestedValue(obj, datePath);
            if (dateValue) {
                return this.formatDate(dateValue);
            }
        }
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : undefined, 
            obj
        );
    }

    private replaceTemplateVariables(template: string, data: TemplateData): string {
        // Handle #each directives
        template = template.replace(
            /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
            (match: string, key: string, content: string) => {
                const array = this.getNestedValue(data, key.trim());
                if (!Array.isArray(array)) return '';
                return array.map(item => {
                    return content.replace(
                        /\{\{([^}]+)\}\}/g,
                        (m: string, k: string) => {
                            const value = this.getNestedValue(item, k.trim());
                            return value !== undefined ? String(value) : '';
                        }
                    );
                }).join('\n');
            }
        );

        // Handle #if directives
        template = template.replace(
            /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (match: string, key: string, content: string) => {
                const value = this.getNestedValue(data, key.trim());
                return value ? content : '';
            }
        );

        // Handle regular variables
        return template.replace(
            /\{\{([^}]+)\}\}/g,
            (match: string, key: string) => {
                const value = this.getNestedValue(data, key.trim());
                return value !== undefined ? String(value) : match;
            }
        );
    }

    async renderPost(post: BlogPost): Promise<string> {
        const baseTemplate = await this.loadTemplate('base');
        const postTemplate = await this.loadTemplate('post');
        
        const postData: TemplateData = {
            ...this.getCommonData(),
            title: post.title,
            date: post.date,
            content: post.content
        };

        const postContent = this.replaceTemplateVariables(postTemplate, postData);
        return this.replaceTemplateVariables(baseTemplate, {
            ...postData,
            content: postContent
        });
    }

    async renderIndex(posts: BlogPost[]): Promise<string> {
        const baseTemplate = await this.loadTemplate('base');
        const indexTemplate = await this.loadTemplate('index');
        
        const indexData: TemplateData = {
            ...this.getCommonData(),
            posts: posts.map(post => ({
                title: post.title,
                date: post.date,
                excerpt: post.excerpt,
                slug: post.slug
            }))
        };

        const indexContent = this.replaceTemplateVariables(indexTemplate, indexData);
        return this.replaceTemplateVariables(baseTemplate, {
            ...indexData,
            content: indexContent
        });
    }
}
