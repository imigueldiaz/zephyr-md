/**
 * Security and validation constants
 */

// File size limits
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Content length limits
export const MAX_TITLE_LENGTH = 200;
export const MAX_LABEL_LENGTH = 50;

// Allowed protocols for URLs
export const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Allowed HTML elements and attributes (if HTML is enabled)
export const ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'];
export const ALLOWED_HTML_ATTRS = ['href', 'title', 'target'];

// Safe attribute values
export const SAFE_TARGET_VALUES = ['_blank', '_self'];

/**
 * Security and validation constants
 */

// File size limits
export const MAX_CODE_BLOCK_SIZE = 10 * 1024; // 10KB
export const MAX_FRONT_MATTER_SIZE = 4 * 1024; // 4KB

// Content length limits
export const MAX_DESCRIPTION_LENGTH = 500;