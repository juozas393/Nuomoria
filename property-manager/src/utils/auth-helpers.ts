/**
 * Auth helper functions for better login experience
 */

/**
 * Normalize identifier to email format
 * - If it contains '@', treat as email
 * - If it's just username, convert to username@app.local
 */
export function normalizeIdentifier(identifier: string): string {
  const val = identifier.trim();
  return val.includes('@') ? val : `${val}@app.local`;
}

/**
 * Check if email is a "shadow" email (generated from username)
 */
export function isShadowEmail(email: string): boolean {
  return email.endsWith('@app.local');
}

/**
 * Extract username from shadow email
 */
export function extractUsername(email: string): string {
  if (isShadowEmail(email)) {
    return email.replace('@app.local', '');
  }
  return email;
}

/**
 * Display name for user - show username if shadow email, otherwise show email
 */
export function getDisplayEmail(email: string): string {
  return isShadowEmail(email) ? extractUsername(email) : email;
}














