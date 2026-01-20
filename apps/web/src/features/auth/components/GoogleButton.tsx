import React from 'react';

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Premium SaaS Google Button
 * - Premium micro-interactions
 * - Perfect icon alignment
 * - Smooth transitions
 */

const GoogleButton: React.FC<GoogleButtonProps> = ({ onClick, loading = false, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full h-12 flex items-center justify-center gap-2.5 rounded-[15px] bg-[#2F8481] text-white px-4 text-[15px] font-semibold shadow-md transition-all duration-[180ms] ease-out hover:bg-[#267673] hover:shadow-[0_6px_20px_rgba(47,132,129,0.3)] hover:-translate-y-[2px] active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8481]/40 focus-visible:ring-offset-2"
      type="button"
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Jungiamasi...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Tęsti su Google</span>
        </>
      )}
    </button>
  );
};

export default GoogleButton;
