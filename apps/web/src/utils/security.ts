/**
 * Security utilities for authentication and input sanitization
 * Google OAuth only - no password hashing needed
 */

// Generate secure random tokens
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate secure session token
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now().toString();
  const randomPart = generateSecureToken();
  return `sess_${userId}_${timestamp}_${randomPart}`;
}

// Validate session token format
export function validateSessionToken(token: string): { valid: boolean; userId?: string } {
  const parts = token.split('_');
  if (parts.length !== 4 || parts[0] !== 'sess') {
    return { valid: false };
  }

  const userId = parts[1];
  const timestamp = parseInt(parts[2]);

  // Check if token is not too old (24 hours)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - timestamp > maxAge) {
    return { valid: false };
  }

  return { valid: true, userId };
}

// XSS Protection - Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
}

// CSRF Token generation
export function generateCSRFToken(): string {
  return generateSecureToken();
}

// Validate CSRF token
export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length === 64; // 32 bytes = 64 hex chars
}
