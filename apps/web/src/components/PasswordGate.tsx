import { useState, useCallback, memo } from 'react';

const SITE_PASSWORD = 'nuomoria2026';
const STORAGE_KEY = 'nuomoria_site_access';

/**
 * PasswordGate — simple password wall for production site.
 * Only active when VITE_ENVIRONMENT === 'production'.
 * Stores access in localStorage so user doesn't need to re-enter.
 */
export const PasswordGate = memo<{ children: React.ReactNode }>(({ children }) => {
    const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';

    const [hasAccess, setHasAccess] = useState(() => {
        if (!isProduction) return true;
        return localStorage.getItem(STORAGE_KEY) === 'granted';
    });
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (password === SITE_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, 'granted');
            setHasAccess(true);
            setError(false);
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    }, [password]);

    if (hasAccess) return <>{children}</>;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            fontFamily: "'Outfit', sans-serif",
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0 24px',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        color: 'white',
                        letterSpacing: '-0.02em',
                        marginBottom: '8px',
                    }}>
                        Nuomoria
                    </div>
                    <div style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.4)',
                    }}>
                        Testavimo aplinka · Restricted Access
                    </div>
                </div>

                {/* Card */}
                <form
                    onSubmit={handleSubmit}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '32px',
                        animation: shake ? 'shake 0.5s ease-in-out' : undefined,
                    }}
                >
                    <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                    }}>
                        Prieigos slaptažodis
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(false); }}
                        placeholder="Įveskite slaptažodį..."
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box',
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(20,184,166,0.5)';
                            e.target.style.boxShadow = error
                                ? '0 0 0 3px rgba(239,68,68,0.1)'
                                : '0 0 0 3px rgba(20,184,166,0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />

                    {error && (
                        <div style={{
                            fontSize: '12px',
                            color: '#ef4444',
                            marginTop: '8px',
                        }}>
                            Neteisingas slaptažodis
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginTop: '16px',
                            background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(20,184,166,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.target as HTMLButtonElement).style.boxShadow = 'none';
                        }}
                    >
                        Prisijungti
                    </button>
                </form>

                <div style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.25)',
                }}>
                    © 2026 Nuomoria. Visos teisės saugomos.
                </div>
            </div>

            {/* Shake animation */}
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
        </div>
    );
});

PasswordGate.displayName = 'PasswordGate';
