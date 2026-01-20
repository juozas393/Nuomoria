/**
 * reCAPTCHA v3 Utility
 * Invisible CAPTCHA that runs in the background
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// Track if script is loaded
let isScriptLoaded = false;
let isScriptLoading = false;

/**
 * Load reCAPTCHA script dynamically
 */
export function loadRecaptchaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isScriptLoaded) {
            resolve();
            return;
        }

        if (isScriptLoading) {
            // Wait for script to load
            const checkLoaded = setInterval(() => {
                if (isScriptLoaded) {
                    clearInterval(checkLoaded);
                    resolve();
                }
            }, 100);
            return;
        }

        if (!RECAPTCHA_SITE_KEY) {
            console.warn('reCAPTCHA site key not configured');
            resolve(); // Don't block if not configured
            return;
        }

        isScriptLoading = true;

        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve();
        };

        script.onerror = () => {
            isScriptLoading = false;
            reject(new Error('Failed to load reCAPTCHA script'));
        };

        document.head.appendChild(script);
    });
}

/**
 * Execute reCAPTCHA and get token
 * @param action - Action name for analytics (e.g., 'login', 'register')
 * @returns Token string or null if not available
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
    if (!RECAPTCHA_SITE_KEY) {
        console.warn('reCAPTCHA not configured, skipping verification');
        return null;
    }

    try {
        await loadRecaptchaScript();

        // Wait for grecaptcha to be ready
        return new Promise((resolve) => {
            if (typeof window.grecaptcha === 'undefined') {
                console.warn('grecaptcha not available');
                resolve(null);
                return;
            }

            window.grecaptcha.ready(() => {
                window.grecaptcha
                    .execute(RECAPTCHA_SITE_KEY, { action })
                    .then((token: string) => {
                        resolve(token);
                    })
                    .catch((error: Error) => {
                        console.error('reCAPTCHA execution failed:', error);
                        resolve(null);
                    });
            });
        });
    } catch (error) {
        console.error('reCAPTCHA error:', error);
        return null;
    }
}

/**
 * Verify reCAPTCHA token server-side
 * Call this from your Edge Function
 */
export async function verifyRecaptchaToken(
    token: string,
    secretKey: string,
    minScore: number = 0.5
): Promise<{ success: boolean; score: number; error?: string }> {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();

        if (!data.success) {
            return {
                success: false,
                score: 0,
                error: data['error-codes']?.join(', ') || 'Verification failed',
            };
        }

        // Check score (0.0 = bot, 1.0 = human)
        const score = data.score || 0;
        if (score < minScore) {
            return {
                success: false,
                score,
                error: `Low score: ${score}`,
            };
        }

        return { success: true, score };
    } catch (error) {
        return {
            success: false,
            score: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// TypeScript declaration for grecaptcha
declare global {
    interface Window {
        grecaptcha: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}
