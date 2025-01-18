import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { minify } from 'html-minifier-terser';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';

interface Config {
    site: {
        title: string;
        description: string;
        language: string;
        siteTheme: string;
        author?: {
            name: string;
        };
        banner?: string;
        'banner-light'?: string;
        'banner-dark'?: string;
    };
    blog?: {
        postsPerPage?: number;
        dateFormat?: string;
    };
    theme?: {
        syntaxHighlighting?: boolean;
        darkMode?: boolean;
    };
}

interface TemplateData {
    [key: string]: any;
}

interface BlogPost {
    title: string;
    slug: string;
    date: Date | string;
    excerpt: string;
    language?: string;
    labels?: string[];
}

type HandlebarsTemplateDelegate = (data: TemplateData) => string;

export class TemplateEngine {
    private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
    private cssFiles: Set<string> = new Set();
    private config: Config;
    private minifyOptions = {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: false,
        minifyJS: true
    };

    constructor(config: Config) {
        console.log('TemplateEngine constructor - Config received:', config);
        this.config = config;
        this.addCssFile('base.css');
        this.addCssFile('code.css');
        this.addCssFile('post.css');
    }

    addCssFile(filename: string): void {
        this.cssFiles.add(filename);
    }

    private async loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
        try {
            console.log(`Attempting to load template ${name}`);
            if (this.templateCache.has(name)) {
                console.log(`Template ${name} found in cache`);
                return this.templateCache.get(name)!;
            }

            // Construir la ruta del template
            const templatePath = join(__dirname, '../templates', this.config.site.siteTheme, `${name}.html`);
            console.log('Loading template from:', templatePath);
            console.log('Template directory exists:', existsSync(join(__dirname, '../templates', this.config.site.siteTheme)));
            
            const templateContent = await readFile(templatePath, 'utf-8');
            console.log(`Template ${name} content loaded:`, templateContent.substring(0, 100) + '...');
            
            const template = Handlebars.compile(templateContent);
            this.templateCache.set(name, template);
            return template;
        } catch (error) {
            console.error(`Error loading template ${name}:`, error);
            throw error;
        }
    }

    async renderTemplate(name: string, data: TemplateData = {}): Promise<string> {
        try {
            console.log(`Rendering template ${name} with data:`, data);
            const template = await this.loadTemplate(name);
            const commonData = await this.getCommonData();
            const mergedData = { ...commonData, ...data };
            console.log(`Merged data for ${name}:`, mergedData);
            
            // If it's a post or index template, wrap it in the base template
            if (name === 'post' || name === 'index' || name === 'tag' || name === 'login' || name === 'upload') {
                console.log(`Wrapping ${name} in base template`);
                const content = template(mergedData);
                console.log(`Content for ${name}:`, content);
                const baseTemplate = await this.loadTemplate('base');
                const result = baseTemplate({
                    ...mergedData,
                    content
                });
                console.log(`Final result for ${name}:`, result);
                return await this.minifyHtml(result);
            }

            // For other templates, just render them directly
            const result = template(mergedData);
            return await this.minifyHtml(result);
        } catch (error) {
            console.error(`Error rendering template ${name}:`, error);
            throw error;
        }
    }

    private async getCommonData(): Promise<TemplateData> {
        const currentYear = new Date().getFullYear();
        
        // Check for banner images
        const possibleExtensions = ['svg', 'png', 'jpg'];
        let siteBanner: string | null = null;
        let siteBannerLight: string | null = null;
        let siteBannerDark: string | null = null;
        
        // Helper function to check file existence
        const checkBannerExists = (baseName: string, ext: string): string | null => {
            const bannerPath = join(__dirname, `../public/images/${baseName}.${ext}`);
            return existsSync(bannerPath) ? `/public/images/${baseName}.${ext}` : null;
        };

        // Check for each extension
        for (const ext of possibleExtensions) {
            // Check default banner
            if (!siteBanner) {
                siteBanner = checkBannerExists('banner', ext);
            }
            
            // Check light mode banner
            if (!siteBannerLight) {
                siteBannerLight = checkBannerExists('banner-light', ext);
            }
            
            // Check dark mode banner
            if (!siteBannerDark) {
                siteBannerDark = checkBannerExists('banner-dark', ext);
            }

            // If we found all variants, break
            if (siteBanner && siteBannerLight && siteBannerDark) {
                break;
            }
        }

        // If theme-specific banners aren't found, fallback to default
        siteBannerLight = siteBannerLight || siteBanner;
        siteBannerDark = siteBannerDark || siteBanner;

        const data = {
            year: currentYear,
            siteBanner,
            siteBannerLight,
            siteBannerDark,
            site: this.config.site,
            blog: this.config.blog,
            theme: this.config.theme
        };

        return data;
    }

    private async minifyHtml(template: string): Promise<string> {
        try {
            const minified = await minify(template, this.minifyOptions);
            return minified;
        } catch (error) {
            console.error('Error minifying HTML:', error);
            return template;
        }
    }

    clearCache(): void {
        this.templateCache.clear();
    }

    formatDate(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleDateString(this.config.site.language, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async renderPost(post: BlogPost): Promise<string> {
        const data = {
            post: {
                ...post,
                date: this.formatDate(post.date),
                language: post.language ? this.getLanguageDisplay(post.language) : null
            }
        };
        return this.renderTemplate('post', data);
    }

    async renderIndex(posts: BlogPost[]): Promise<string> {
        const data = {
            posts: posts.map(post => ({
                title: post.title,
                slug: post.slug,
                date: post.date,
                date_formatted: this.formatDate(post.date),
                excerpt: post.excerpt,
                labels: post.labels
            }))
        };
        return this.renderTemplate('index', data);
    }

    async renderTagPage(tag: string, posts: BlogPost[]): Promise<string> {
        const data = {
            tag,
            posts: posts.map(post => ({
                title: post.title,
                slug: post.slug,
                date: post.date,
                date_formatted: this.formatDate(post.date),
                excerpt: post.excerpt,
                labels: post.labels
            }))
        };
        return this.renderTemplate('tag', data);
    }

    private getLanguageDisplay(language: string): { flag: string, name: string } {
        // Mapa de idiomas a nombres
        const languageNames: { [key: string]: string } = {
            'es': 'Español',
            'en': 'English',
            'fr': 'Français',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어'
        };

        const langCode = language.toLowerCase().split('-')[0];
        return {
            flag: this.languageToFlag(langCode),
            name: languageNames[langCode] || language.toUpperCase()
        };
    }

    private languageToFlag(language: string): string {
        // Mapa de idiomas a emojis de banderas
        const languageToFlag: { [key: string]: string } = {
            'es': '🇪🇸',
            'en': '🇬🇧',
            'fr': '🇫🇷',
            'de': '🇩🇪',
            'it': '🇮🇹',
            'pt': '🇵🇹',
            'ru': '🇷🇺',
            'zh': '🇨🇳',
            'ja': '🇯🇵',
            'ko': '🇰🇷'
        };

        return languageToFlag[language] || '🌐';
    }
}
