/**
 * Security Utilities - Input Sanitization & Validation
 * Protects against XSS, SQL injection patterns, and invalid input
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '');
}

/**
 * Detect potential SQL injection patterns
 */
export function detectSqlInjection(str: string): boolean {
    if (!str || typeof str !== 'string') return false;

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
        /(\b(UNION|JOIN)\b.*\b(SELECT)\b)/i,
        /(--|\#|\/\*|\*\/)/,
        /(\bOR\b.*=.*)/i,
        /(\bAND\b.*=.*)/i,
        /(\'|\"|;).*(\bOR\b|\bAND\b)/i,
        /(\bEXEC\b|\bEXECUTE\b)/i,
        /(\bXP_\w+)/i,
        /(\bSP_\w+)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
}

/**
 * Detect potential XSS patterns
 */
export function detectXss(str: string): boolean {
    if (!str || typeof str !== 'string') return false;

    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /<link/gi,
        /expression\s*\(/gi,
        /url\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(str));
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
    if (!email || typeof email !== 'string') {
        return { valid: false, sanitized: '', error: 'El. paštas yra privalomas' };
    }

    const trimmed = email.trim().toLowerCase();

    // Check for injection attempts
    if (detectSqlInjection(trimmed) || detectXss(trimmed)) {
        return { valid: false, sanitized: '', error: 'Neteisingi simboliai el. pašte' };
    }

    // Email regex validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(trimmed)) {
        return { valid: false, sanitized: trimmed, error: 'Neteisingas el. pašto formatas' };
    }

    if (trimmed.length > 254) {
        return { valid: false, sanitized: trimmed, error: 'El. paštas per ilgas' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
    if (!phone || typeof phone !== 'string') {
        return { valid: true, sanitized: '' }; // Phone is often optional
    }

    // Remove all non-digit characters except + at the start
    let sanitized = phone.replace(/[^\d+]/g, '');
    if (sanitized.startsWith('+')) {
        sanitized = '+' + sanitized.slice(1).replace(/\+/g, '');
    }

    // Check minimum length (Lithuanian numbers are 8-12 digits)
    const digitsOnly = sanitized.replace(/\+/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return { valid: false, sanitized, error: 'Neteisingas telefono numerio formatas' };
    }

    return { valid: true, sanitized };
}

/**
 * Sanitize general text input (names, descriptions, etc.)
 */
export function sanitizeText(
    text: string,
    options: { maxLength?: number; allowHtml?: boolean } = {}
): { valid: boolean; sanitized: string; error?: string } {
    const { maxLength = 1000, allowHtml = false } = options;

    if (!text || typeof text !== 'string') {
        return { valid: true, sanitized: '' };
    }

    let sanitized = text.trim();

    // Check for SQL injection
    if (detectSqlInjection(sanitized)) {
        return { valid: false, sanitized: '', error: 'Aptikti neteisingi simboliai' };
    }

    // Handle HTML based on options
    if (!allowHtml) {
        if (detectXss(sanitized)) {
            return { valid: false, sanitized: '', error: 'Aptikti neteisingi simboliai' };
        }
        sanitized = stripHtml(sanitized);
        sanitized = escapeHtml(sanitized);
    }

    // Check length
    if (sanitized.length > maxLength) {
        return { valid: false, sanitized: sanitized.slice(0, maxLength), error: `Tekstas per ilgas (max ${maxLength} simbolių)` };
    }

    return { valid: true, sanitized };
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
    value: string | number,
    options: { min?: number; max?: number; decimals?: number } = {}
): { valid: boolean; sanitized: number | null; error?: string } {
    const { min = 0, max = Number.MAX_SAFE_INTEGER, decimals = 2 } = options;

    if (value === '' || value === null || value === undefined) {
        return { valid: true, sanitized: null };
    }

    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;

    if (isNaN(num)) {
        return { valid: false, sanitized: null, error: 'Neteisingas skaičius' };
    }

    if (num < min) {
        return { valid: false, sanitized: num, error: `Skaičius negali būti mažesnis nei ${min}` };
    }

    if (num > max) {
        return { valid: false, sanitized: num, error: `Skaičius negali būti didesnis nei ${max}` };
    }

    const sanitized = Number(num.toFixed(decimals));
    return { valid: true, sanitized };
}


/**
 * Rate limiting helper for client-side
 */
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkClientRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remainingAttempts: maxAttempts - 1, resetIn: windowMs };
    }

    if (entry.count >= maxAttempts) {
        return { allowed: false, remainingAttempts: 0, resetIn: entry.resetAt - now };
    }

    entry.count += 1;
    return { allowed: true, remainingAttempts: maxAttempts - entry.count, resetIn: entry.resetAt - now };
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
export function resetClientRateLimit(key: string): void {
    rateLimitStore.delete(key);
}
