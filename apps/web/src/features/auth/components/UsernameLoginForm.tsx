import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getLoginInfoByUsername } from '../services/usernameLogin';

interface UsernameLoginFormProps {
  onSuccess?: () => void;
  theme?: "light" | "dark";
}

/**
 * Premium SaaS Accordion - Existing Users Login
 * - Theme-aware styling (light/dark)
 * - Design system quality
 * - Smooth animations
 * - Modern inputs with focus states
 */

const UsernameLoginForm: React.FC<UsernameLoginFormProps> = ({ onSuccess, theme = "light" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await getLoginInfoByUsername(username.trim());

      if (!result.success || !result.data) {
        setError(result.error || 'Klaida prisijungiant.');
        setLoading(false);
        return;
      }

      if (!result.data.email) {
        setError('Vartotojo el. paštas nerastas. Prisijunkite su Google.');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Neteisingas slaptažodis.');
        } else {
          setError('Klaida prisijungiant. Bandykite dar kartą.');
        }
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Įvyko nenumatyta klaida.');
      setLoading(false);
    }
  };

  // Theme-based styles
  const isDark = theme === "dark";

  return (
    <div className="relative overflow-hidden">
      {/* Premium Accordion Trigger - Theme Aware */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="username-login-form"
        className="relative z-10 w-full flex items-center justify-between px-4 py-3.5 text-left rounded-[14px] transition-colors duration-[180ms] ease-out overflow-hidden shadow-sm"
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8FAFC',
          borderWidth: '1px',
          borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#EAECF0'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : '#F8FAFC'}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold mb-1 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.92)' : '#000' }}>
            Esami vartotojai
          </div>
          <div className="text-[12px] truncate" style={{ color: isDark ? 'rgba(255,255,255,0.60)' : '#667085' }}>
            Prisijunkite su vartotojo vardu
          </div>
        </div>
        <svg
          className={`flex-shrink-0 ml-3 transition-transform duration-[200ms] ease-out ${isExpanded ? 'rotate-180' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ color: isDark ? 'rgba(255,255,255,0.50)' : '#98A2B3' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 animate-slideDown overflow-hidden">
          <form
            id="username-login-form"
            onSubmit={handleSubmit}
            className="space-y-3.5"
          >
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-[13px] font-semibold mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#344054' }}>
                Vartotojo vardas
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pvz. neblekas"
                disabled={loading}
                required
                autoComplete="username"
                className="w-full h-11 px-3.5 rounded-[13px] text-[14px] shadow-sm transition-colors duration-[180ms] ease-out focus-visible:outline-none disabled:opacity-50"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                  borderWidth: '1px',
                  borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#D0D5DD',
                  color: isDark ? 'rgba(255,255,255,0.92)' : '#000'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2F8481';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 0 0 3px rgba(47,132,129,0.2)'
                    : '0 0 0 3px rgba(47,132,129,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.18)' : '#D0D5DD';
                  e.currentTarget.style.boxShadow = '';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[13px] font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#344054' }}>
                  Slaptažodis
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-[12px] font-medium transition-colors duration-150"
                  style={{ color: isDark ? 'rgba(47,132,129,1)' : '#2F8481' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#267673'}
                  onMouseLeave={(e) => e.currentTarget.style.color = isDark ? 'rgba(47,132,129,1)' : '#2F8481'}
                >
                  Pamiršote?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="w-full h-11 px-3.5 pr-11 rounded-[13px] text-[14px] shadow-sm transition-colors duration-[180ms] ease-out focus-visible:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderWidth: '1px',
                    borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#D0D5DD',
                    color: isDark ? 'rgba(255,255,255,0.92)' : '#000'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2F8481';
                    e.currentTarget.style.boxShadow = isDark
                      ? '0 0 0 3px rgba(47,132,129,0.2)'
                      : '0 0 0 3px rgba(47,132,129,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.18)' : '#D0D5DD';
                    e.currentTarget.style.boxShadow = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8481]/40"
                  style={{ color: isDark ? 'rgba(255,255,255,0.50)' : '#98A2B3' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.75)' : '#667085'}
                  onMouseLeave={(e) => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.50)' : '#98A2B3'}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-[13px] px-3.5 py-2.5 text-[12px] flex items-start gap-2 shadow-sm"
                style={{
                  backgroundColor: isDark ? 'rgba(244,63,94,0.15)' : '#FEF3F2',
                  borderWidth: '1px',
                  borderColor: isDark ? 'rgba(244,63,94,0.30)' : '#FECDCA',
                  color: isDark ? 'rgba(254,202,202,1)' : '#B42318'
                }}
              >
                <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full h-[48px] text-white px-4 rounded-[14px] text-[14px] font-semibold transition-colors duration-[180ms] ease-out disabled:opacity-50 disabled:cursor-not-allowed shadow-sm disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8481]/40 focus-visible:ring-offset-2"
              style={{
                backgroundColor: '#2F8481',
                ...(isDark && { boxShadow: '0 2px 8px rgba(47,132,129,0.3)' })
              }}
              onMouseEnter={(e) => {
                if (!loading && username.trim() && password) {
                  e.currentTarget.style.backgroundColor = '#267673';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 6px 20px rgba(47,132,129,0.4)'
                    : '0 4px 12px rgba(47,132,129,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2F8481';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 2px 8px rgba(47,132,129,0.3)'
                  : '0 1px 2px rgba(0,0,0,0.05)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Jungiamasi...
                </span>
              ) : (
                'Prisijungti'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Modal */}
      {showForgotPasswordModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setShowForgotPasswordModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2.5">Slaptažodžio atstatymas</h3>
            <p className="text-[15px] text-gray-600 mb-5 leading-relaxed">
              Prisijunkite su Google ir atstatykite slaptažodį nustatymuose.
            </p>
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-full h-12 bg-[#2F8481] text-white rounded-xl font-semibold hover:bg-[#267673] transition-colors shadow-md hover:shadow-lg text-[15px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200"
            >
              Supratau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsernameLoginForm;
