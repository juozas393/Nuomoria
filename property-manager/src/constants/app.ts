/**
 * Application Constants
 * Following best practices: extract all magic numbers and strings
 */

// ============================================================================
// CACHE & PERFORMANCE
// ============================================================================
export const CACHE_DURATION = 30000; // 30 seconds
export const DEBOUNCE_SEARCH_MS = 300; // Search input debounce
export const THROTTLE_SCROLL_MS = 100; // Scroll event throttle

// ============================================================================
// PAGINATION
// ============================================================================
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================================
// IMAGES & ASSETS
// ============================================================================
export const MAX_IMAGE_SIZE_KB = 200; // 200KB per image
export const MAX_HERO_IMAGE_SIZE_KB = 350; // 350KB for hero images
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// ============================================================================
// BUNDLE SIZE TARGETS (following ultimate_performance_rules)
// ============================================================================
export const TARGET_INITIAL_JS_KB = 180; // gzipped
export const TARGET_INITIAL_CSS_KB = 40; // gzipped

// ============================================================================
// CORE WEB VITALS TARGETS
// ============================================================================
export const TARGET_LCP_MS = 2500; // Largest Contentful Paint
export const TARGET_FCP_MS = 1500; // First Contentful Paint
export const TARGET_CLS = 0.1; // Cumulative Layout Shift
export const TARGET_INP_MS = 200; // Interaction to Next Paint

// ============================================================================
// UI/UX
// ============================================================================
export const MODAL_ANIMATION_MS = 200;
export const TOAST_DURATION_MS = 3000;
export const TOAST_ERROR_DURATION_MS = 5000;

// ============================================================================
// AUTHENTICATION
// ============================================================================
export const SESSION_TIMEOUT_MS = 3600000; // 1 hour
export const TOKEN_REFRESH_THRESHOLD_MS = 300000; // 5 minutes before expiry

// ============================================================================
// DATA VALIDATION
// ============================================================================
export const MIN_APARTMENT_NUMBER_LENGTH = 1;
export const MAX_APARTMENT_NUMBER_LENGTH = 10;
export const MIN_TENANT_NAME_LENGTH = 2;
export const MAX_TENANT_NAME_LENGTH = 100;
export const MIN_ADDRESS_LENGTH = 5;
export const MAX_ADDRESS_LENGTH = 200;

// ============================================================================
// ERROR MESSAGES (Lithuanian)
// ============================================================================
export const ERROR_MESSAGES = {
  GENERIC: 'Klaida kraunant duomenis. Bandykite dar kartą.',
  NETWORK: 'Tinklo klaida. Patikrinkite interneto ryšį.',
  UNAUTHORIZED: 'Neturite teisių atlikti šį veiksmą.',
  NOT_FOUND: 'Duomenys nerasti.',
  VALIDATION: 'Neteisingi duomenys. Patikrinkite ir bandykite dar kartą.',
  TIMEOUT: 'Užklausa užtruko per ilgai. Bandykite dar kartą.',
} as const;

// ============================================================================
// SUCCESS MESSAGES (Lithuanian)
// ============================================================================
export const SUCCESS_MESSAGES = {
  SAVED: 'Sėkmingai išsaugota!',
  DELETED: 'Sėkmingai ištrinta!',
  UPDATED: 'Sėkmingai atnaujinta!',
  SENT: 'Sėkmingai išsiųsta!',
} as const;

// ============================================================================
// STATUS CONSTANTS
// ============================================================================
export const PROPERTY_STATUS = {
  OCCUPIED: 'occupied',
  VACANT: 'vacant',
  MAINTENANCE: 'maintenance',
} as const;

export const TENANT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  PENDING: 'pending',
  MOVING_OUT: 'moving_out',
  VACANT: 'vacant',
} as const;

// ============================================================================
// COLOR PALETTE (from rules)
// ============================================================================
export const COLORS = {
  PRIMARY: '#2F8481',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  TOAST: 100,
} as const;

// ============================================================================
// BREAKPOINTS (Tailwind defaults)
// ============================================================================
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ============================================================================
// API ENDPOINTS (if needed)
// ============================================================================
export const API_ENDPOINTS = {
  PROPERTIES: '/properties',
  ADDRESSES: '/addresses',
  TENANTS: '/tenants',
  METERS: '/meters',
  METER_READINGS: '/meter_readings',
} as const;


