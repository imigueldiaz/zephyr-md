export interface BlogPost {
    title: string;
    date: string;
    content: string;
    excerpt?: string;
    slug: string;
}

export interface PostMetadata {
    title: string;
    date: string;
    excerpt?: string;
}

export interface GrayMatterFile<T = any> {
    data: T;
    content: string;
    excerpt?: string;
    orig: string;
    language: string;
    matter: string;
    stringify(lang?: string): string;
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

export interface SiteConfig {
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
}

export interface BlogConfig {
    postsPerPage: number;
    dateFormat: string;
    license: {
        name: string;
        url: string;
    };
}

export interface ThemeConfig {
    defaultMode: 'light' | 'dark' | 'auto';
    accentColor: string;
}

export interface Config {
    site: SiteConfig;
    blog: BlogConfig;
    theme: ThemeConfig;
}