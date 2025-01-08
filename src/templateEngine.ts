import { readFile } from 'fs/promises';
import { join } from 'path';
import { format, parse } from 'date-fns';
import { BlogPost } from './types';
import { minify } from 'html-minifier-terser';

interface SiteConfig {
    site: {
        title: string;
        description: string;
        language: string;
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
    private readonly minifyOptions = {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        collapseBooleanAttributes: true,
        processConditionalComments: true,
        removeEmptyElements: false, // Mantener elementos vacíos por seguridad
        caseSensitive: true // Mantener mayúsculas/minúsculas para evitar problemas
    };

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
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : undefined, obj);
    }

    private replaceTemplateVariables(template: string, data: TemplateData): string {
        let result = template;

        // Handle #each directives
        result = result.replace(
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
        result = result.replace(
            /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
            (match: string, key: string, content: string) => {
                const value = this.getNestedValue(data, key.trim());
                return value ? content : '';
            }
        );

        // Handle regular variables
        result = result.replace(
            /\{\{([^}]+)\}\}/g,
            (match: string, key: string) => {
                const value = this.getNestedValue(data, key.trim());
                return value !== undefined ? String(value) : match;
            }
        );

        return result;
    }

    private processTemplateData(data: TemplateData): TemplateData {
        const processedData: TemplateData = { ...data };

        // Procesar fechas si existen
        if (processedData.date) {
            processedData.date = processedData.date; // Mantener la fecha original para el atributo datetime
            processedData.date_formatted = this.formatDate(processedData.date);
        }

        // Procesar fechas en posts si existen
        if (Array.isArray(processedData.posts)) {
            processedData.posts = processedData.posts.map(post => ({
                ...post,
                date: post.date, // Mantener la fecha original para el atributo datetime
                date_formatted: this.formatDate(post.date)
            }));
        }

        return processedData;
    }

    private async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
        let template = this.templates.get(templateName);
        if (!template) {
            template = await this.loadTemplate(templateName);
            this.templates.set(templateName, template);
        }

        // Procesar los datos y reemplazar variables en la plantilla
        const processedData = this.processTemplateData(data);
        let html = this.replaceTemplateVariables(template, processedData);

        // Minificar el HTML antes de devolverlo
        try {
            const originalSize = Buffer.from(html).length;
            const minified = await minify(html, this.minifyOptions);
            const minifiedSize = Buffer.from(minified).length;
            const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
            console.log(`HTML minification: ${originalSize} -> ${minifiedSize} bytes (${reduction}% reduction)`);
            return minified;
        } catch (error) {
            console.error('Error minifying HTML:', error);
            return html; // En caso de error, devolver el HTML sin minificar
        }
    }

    async renderPost(post: BlogPost): Promise<string> {
        const baseTemplate = await this.renderTemplate('base', {
            ...this.getCommonData(),
            content: await this.renderTemplate('post', {
                ...this.getCommonData(),
                title: post.title,
                date: post.date,
                content: post.content
            })
        });
        return baseTemplate;
    }

    async renderIndex(posts: BlogPost[]): Promise<string> {
        const baseTemplate = await this.renderTemplate('base', {
            ...this.getCommonData(),
            content: await this.renderTemplate('index', {
                ...this.getCommonData(),
                posts: posts.map(post => ({
                    title: post.title,
                    date: post.date,
                    excerpt: post.excerpt,
                    slug: post.slug
                }))
            })
        });
        return baseTemplate;
    }
}
