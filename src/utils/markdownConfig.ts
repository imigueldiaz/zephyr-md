import MarkdownIt from 'markdown-it';

// Safe markdown configuration with precompiled rules
const md = new MarkdownIt('zero', {
    html: false,        // Never allow HTML
    xhtmlOut: true,     // Use '/' to close single tags (<br />)
    breaks: false,      // Convert '\n' in paragraphs into <br>
    linkify: true,      // Autoconvert URL-like text to links
    typographer: true   // Enable smartquotes and other replacements
});

// Configure typographic replacements
md.options.quotes = ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'];

// Enable only safe markdown features with limited nesting
const SAFE_FEATURES = [
    'heading',
    'lheading',
    'paragraph',
    'blockquote',
    'list',
    'bullet',
    'reference',
    'emphasis',
    'link',
    'image',
    'code',
    'fence',
    'hr',
    'softbreak',
    'hardbreak'
] as const;

// Enable safe features
SAFE_FEATURES.forEach(feature => md.enable(feature));

// Add security rules
md.core.ruler.after('inline', 'max-nesting', state => {
    let maxNesting = 20; // Maximum nesting level for blocks
    let maxFound = 0;
    
    state.tokens.forEach(token => {
        if (token.level > maxFound) {
            maxFound = token.level;
        }
    });
    
    if (maxFound > maxNesting) {
        state.env.maxNestingError = true;
        return false;
    }
    return true;
});

// Custom link validator
md.validateLink = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

// Precompile common markdown patterns
const PRECOMPILED_PATTERNS = {
    heading: /^#{1,6}\s/,
    link: /\[([^\]]+)\]\(([^)]+)\)/,
    image: /!\[([^\]]+)\]\(([^)]+)\)/,
    code: /`{1,3}[^`]*`{1,3}/,
    emphasis: /(\*|_){1,2}[^*_]+(\*|_){1,2}/
} as const;

export { md as safeMarkdown, PRECOMPILED_PATTERNS };
