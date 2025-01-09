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
}

type HandlebarsTemplateDelegate = (data: TemplateData) => string;

export class TemplateEngine {
    private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
    private cssFiles: Set<string> = new Set();
    private config: Config;
    private minifyOptions = {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true
    };

    constructor(config: Config) {
        this.config = config;
        this.addCssFile('base.css');
        this.addCssFile('code.css');
        this.addCssFile('post.css');
    }

    addCssFile(filename: string): void {
        this.cssFiles.add(filename);
    }

    private async loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
        if (this.templateCache.has(name)) {
            return this.templateCache.get(name)!;
        }

        const templatePath = join(__dirname, `../templates/${this.config.site.siteTheme}/${name}.html`);
        const templateContent = await readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        this.templateCache.set(name, template);
        return template;
    }

    async renderTemplate(name: string, data: TemplateData = {}): Promise<string> {
        try {
            console.log(`Rendering template ${name} with data:`, data);
            const template = await this.loadTemplate(name);
            const commonData = await this.getCommonData();
            const mergedData = { ...commonData, ...data };
            console.log('Final template data:', JSON.stringify(mergedData, null, 2));
            
            // If it's a post or index template, wrap it in the base template
            if (name === 'post' || name === 'index') {
                const content = template(mergedData);
                const baseTemplate = await this.loadTemplate('base');
                const result = baseTemplate({
                    ...mergedData,
                    content
                });
                return minify(result, this.minifyOptions);
            }

            // For other templates, just render them directly
            const result = template(mergedData);
            return minify(result, this.minifyOptions);
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
            console.log('Checking for banner at:', bannerPath);
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

        const baseCSS = readFileSync(join(__dirname, '../templates/default/css/base.css'), 'utf8');
        const codeCSS = readFileSync(join(__dirname, '../templates/default/css/code.css'), 'utf8');
        const postCSS = readFileSync(join(__dirname, '../templates/default/css/post.css'), 'utf8');

        const data = {
            year: currentYear,
            baseCSS: `<style>${baseCSS}</style>`,
            codeCSS: `<style>${codeCSS}</style>`,
            postCSS: `<style>${postCSS}</style>`,
            siteBanner,
            siteBannerLight,
            siteBannerDark,
            site: this.config.site,
            blog: this.config.blog,
            theme: this.config.theme
        };

        console.log('Common data:', JSON.stringify(data, null, 2));
        return data;
    }

    private generateCssLinks(): string {
        return Array.from(this.cssFiles)
            .map(file => `<link rel="stylesheet" href="/css/${this.config.site.siteTheme}/css/${file}">`)
            .join('\n');
    }

    private getTemplateData(processedContent: string): TemplateData {
        const currentYear = new Date().getFullYear();
        const siteBanner = this.config.site.banner;
        const siteBannerLight = this.config.site['banner-light'];
        const siteBannerDark = this.config.site['banner-dark'];

        const data = {
            year: currentYear,
            baseCSS: this.generateCssLinks(),
            codeCSS: this.generateCssLinks(),
            siteBanner,
            siteBannerLight,
            siteBannerDark,
            site: this.config.site,
            content: processedContent,
            blog: this.config.blog
        };

        return data;
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
        console.log('Rendering post with data:', JSON.stringify(post, null, 2));
        const data = {
            post: {
                ...post,
                date: this.formatDate(post.date),
                language: post.language ? this.getLanguageDisplay(post.language) : null
            }
        };
        console.log('Template data:', JSON.stringify(data, null, 2));
        return this.renderTemplate('post', data);
    }

    async renderIndex(posts: BlogPost[]): Promise<string> {
        console.log('Rendering index with posts:', posts);
        const data = {
            posts: posts.map(post => {
                console.log('Processing post for index:', post);
                return {
                    title: post.title,
                    slug: post.slug,
                    date: post.date,
                    date_formatted: this.formatDate(post.date),
                    excerpt: post.excerpt
                };
            })
        };
        return this.renderTemplate('index', data);
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
