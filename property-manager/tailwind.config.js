/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // ✅ PALETTE RULES: Only #2F8481, #000000, #FFFFFF
        primary: '#2F8481',
        black: '#000000',
        white: '#FFFFFF',
        // Helper shades derived from palette
        'primary-hover': '#297a77',
        'primary-light': '#E8F5F4',
        'primary-dark': '#225f5c',
        // Minimal grayscale for UI (black-based)
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#000000', // Pure black
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'loading': 'loading 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        loading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      height: {
        '9': '2.25rem', // Compact button height
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['0.875rem', { lineHeight: '1.5' }], // Base 14px
        'lg': ['1rem', { lineHeight: '1.5' }],
        'xl': ['1.125rem', { lineHeight: '1.75' }], // Sections 18px
        '2xl': ['1.25rem', { lineHeight: '1.75' }], // Sections 20px
        '3xl': ['1.5rem', { lineHeight: '1.25' }], // Page headers 24px
        '4xl': ['1.75rem', { lineHeight: '1.25' }], // Page headers 28px
      },
      borderRadius: {
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.625rem',  // 10px - primary
        'xl': '0.75rem',   // 12px - primary
        '2xl': '1rem',     // 16px
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    // Performance-focused plugins
    function({ addUtilities, addComponents, theme }) {
      // Performance utilities
      addUtilities({
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.will-change-opacity': {
          'will-change': 'opacity',
        },
        '.will-change-scroll': {
          'will-change': 'scroll-position',
        },
        '.contain-layout': {
          'contain': 'layout',
        },
        '.contain-paint': {
          'contain': 'paint',
        },
        '.contain-strict': {
          'contain': 'strict',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.transform-gpu': {
          'transform': 'translateZ(0)',
        },
      });

      // Performance-focused components
      addComponents({
        '.loading-skeleton': {
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'loading 1.5s infinite',
        },
        '.card-optimized': {
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e5e5',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            borderColor: '#2F8481',
          },
        },
        '.btn-optimized': {
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontWeight: '500',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      });
    },
  ],
  // Performance optimizations
  corePlugins: {
    // Disable unused features for better performance
    preflight: true,
    container: false, // We use custom container
    accessibility: true,
  },
  // JIT mode for better performance
  mode: 'jit',
  // Purge unused styles
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/index.html'
    ],
    options: {
      safelist: [
        'animate-spin',
        'animate-pulse',
        'animate-bounce',
        'animate-fade-in',
        'animate-slide-in',
        'loading-skeleton',
        'card-optimized',
        'btn-optimized',
      ]
    }
  }
}; 