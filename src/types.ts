export interface BlogPost {
    title: string;
    date: string;
    content: string;
    excerpt?: string;
    slug: string;
    language?: string;
    labels?: string[];
    rawLabels?: string;
}

export interface PostMetadata {
    title: string;
    date: string;
    excerpt?: string;
    language?: string;
    labels?: string;
}

export interface GrayMatterFile<T = any> {
    data: T;
    content: string;
    excerpt?: string;
    orig: string;
    language: string;
    matter: string;
    stringify(lang?: string): string;
    labels?: string[];
}

export type GrayMatterOptions = {
    excerpt?: boolean | ((input: string) => string);
    excerpt_separator?: string;
    engines?: Record<string, any>;
    language?: string;
    delimiters?: string | [string, string];
} & Record<string, any>;

export interface Matter {
    (str: string, options?: GrayMatterOptions): GrayMatterFile;
    read(filepath: string, options?: GrayMatterOptions): GrayMatterFile;
    stringify(str: string, data: any, options?: GrayMatterOptions): string;
}

export interface TemplateData {
    [key: string]: any;
}

export interface BlogConfig {
    postsPerPage?: number;
    dateFormat?: string;
    license?: {
        name: string;
        url: string;
    };
}

export interface ThemeConfig {
    defaultMode?: 'light' | 'dark' | 'auto';
    accentColor?: string;
    syntaxHighlighting?: boolean;
    darkMode?: boolean;
}

export interface SiteConfig {
    title: string;
    description: string;
    language: string;
    siteTheme: string;
    author?: {
        name: string;
        email: string;
        url: string;
    };
    social?: {
        github: string;
        twitter: string;
    };
}

export interface Config {
    site: SiteConfig;
    blog?: BlogConfig;
    theme?: ThemeConfig;
}