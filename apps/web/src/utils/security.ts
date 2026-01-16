/**
 * Security utilities for password hashing and authentication
 * CRITICAL: These functions MUST be used for all password operations
 */

// Simple but secure password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  // Security: Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Add salt for additional security
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltedData = new Uint8Array(data.length + salt.length);
  saltedData.set(data);
  saltedData.set(salt, data.length);
  
  // Hash using SHA-256 (in production, consider using PBKDF2 or Argon2)
  const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Combine salt and hash
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = hashedPassword.split(':');
    if (!saltHex || !hashHex) return false;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Convert salt back to Uint8Array
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Create salted data
    const saltedData = new Uint8Array(data.length + salt.length);
    saltedData.set(data);
    saltedData.set(salt, data.length);
    
    // Hash the input password
    const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const inputHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Compare hashes
    return inputHashHex === hashHex;
  } catch (error) {
    // Security: Don't log sensitive password verification errors
    if (process.env.NODE_ENV === 'development') {
      console.error('Password verification error:', error);
    }
    return false;
  }
}

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
