// Rate limiting utilities for email-first authentication
// In production, this should be implemented server-side

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts per window
  blockDurationMs: number; // How long to block after exceeding limit
}

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('rate_limits');
      if (stored) {
        const data = JSON.parse(stored);
        this.storage = new Map(Object.entries(data));
      }
    } catch (error) {
      // Security: Don't log sensitive rate limiting errors
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load rate limits from storage:', error);
      }
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.storage);
      localStorage.setItem('rate_limits', JSON.stringify(data));
    } catch (error) {
      // Security: Don't log sensitive rate limiting errors
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save rate limits to storage:', error);
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.storage.entries());
    for (const [key, entry] of entries) {
      // Remove expired entries
      if (now - entry.firstAttempt > this.config.windowMs && !entry.blockedUntil) {
        this.storage.delete(key);
      }
      // Remove expired blocks
      if (entry.blockedUntil && now > entry.blockedUntil) {
        this.storage.delete(key);
      }
    }
    this.saveToStorage();
  }

  isAllowed(identifier: string): { allowed: boolean; remainingAttempts: number; resetTime?: number } {
    this.cleanup();
    
    const now = Date.now();
    const entry = this.storage.get(identifier);

    // If no entry exists, allow
    if (!entry) {
      return { allowed: true, remainingAttempts: this.config.maxAttempts };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime: entry.blockedUntil
      };
    }

    // Check if window has expired
    if (now - entry.firstAttempt > this.config.windowMs) {
      this.storage.delete(identifier);
      this.saveToStorage();
      return { allowed: true, remainingAttempts: this.config.maxAttempts };
    }

    // Check if within limit
    const remainingAttempts = Math.max(0, this.config.maxAttempts - entry.attempts);
    return { 
      allowed: entry.attempts < this.config.maxAttempts, 
      remainingAttempts 
    };
  }

  recordAttempt(identifier: string): { allowed: boolean; remainingAttempts: number; blockedUntil?: number } {
    this.cleanup();
    
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry) {
      // First attempt
      const newEntry: RateLimitEntry = {
        attempts: 1,
        firstAttempt: now
      };
      this.storage.set(identifier, newEntry);
      this.saveToStorage();
      return { allowed: true, remainingAttempts: this.config.maxAttempts - 1 };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return { 
        allowed: false, 
        remainingAttempts: 0,
        blockedUntil: entry.blockedUntil
      };
    }

    // Check if window has expired
    if (now - entry.firstAttempt > this.config.windowMs) {
      // Reset window
      const newEntry: RateLimitEntry = {
        attempts: 1,
        firstAttempt: now
      };
      this.storage.set(identifier, newEntry);
      this.saveToStorage();
      return { allowed: true, remainingAttempts: this.config.maxAttempts - 1 };
    }

    // Increment attempts
    entry.attempts++;
    
    // Check if limit exceeded
    if (entry.attempts >= this.config.maxAttempts) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      this.saveToStorage();
      return { 
        allowed: false, 
        remainingAttempts: 0,
        blockedUntil: entry.blockedUntil
      };
    }

    this.saveToStorage();
    return { 
      allowed: true, 
      remainingAttempts: this.config.maxAttempts - entry.attempts 
    };
  }

  reset(identifier: string) {
    this.storage.delete(identifier);
    this.saveToStorage();
  }

  getStatus(identifier: string) {
    this.cleanup();
    return this.isAllowed(identifier);
  }
}

// Pre-configured rate limiters for different use cases
export const magicLinkRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 3, // 3 magic links per 15 minutes
  blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
});

export const otpRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 5, // 5 OTP requests per 5 minutes
  blockDurationMs: 15 * 60 * 1000 // Block for 15 minutes
});

export const otpVerificationRateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxAttempts: 3, // 3 verification attempts per 10 minutes
  blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
});

// Utility functions
export const checkRateLimit = (limiter: RateLimiter, identifier: string) => {
  return limiter.isAllowed(identifier);
};

export const recordRateLimitAttempt = (limiter: RateLimiter, identifier: string) => {
  return limiter.recordAttempt(identifier);
};

export const resetRateLimit = (limiter: RateLimiter, identifier: string) => {
  limiter.reset(identifier);
};

// Helper to get user-friendly error messages
export const getRateLimitMessage = (status: { allowed: boolean; remainingAttempts: number; resetTime?: number }) => {
  if (status.allowed) {
    return null;
  }

  if (status.resetTime) {
    const minutes = Math.ceil((status.resetTime - Date.now()) / (1000 * 60));
    return `Per daug bandymų. Bandykite dar kartą po ${minutes} min.`;
  }

  return `Per daug bandymų. Bandykite dar kartą vėliau.`;
};
