// Geocoding utilities using Nominatim (OpenStreetMap)
// No proxy needed — Nominatim allows CORS, no API key required
// Rate limit: 1 req/sec (handled by AbortController + caching)

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// ── Interfaces ──────────────────────────────────────────────

export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
  city?: string;
  postcode?: string;
  formatted_address: string;
}

export interface AddressSuggestion {
  display_name: string;
  short_name: string;
  lat: number;
  lng: number;
  city?: string;
  postcode?: string;
  street?: string;
  houseNumber?: string;
  district?: string;
}

// ── Caches ──────────────────────────────────────────────────

const geocodeCache = new Map<string, GeocodingResult | null>();
const GEOCODE_CACHE_MAX = 30;

const suggestionCache = new Map<string, AddressSuggestion[]>();
const SUGGESTION_CACHE_MAX = 50;

// AbortController — cancels stale suggestion requests when user types ahead
let activeAbortController: AbortController | null = null;

// ── Geocoding ───────────────────────────────────────────────

/**
 * Geocode address string → coordinates + structured result
 * Results are cached — subsequent calls with the same address are instant
 */
export async function geocodeAddress(
  address: string,
  _country: string = 'Lithuania'
): Promise<GeocodingResult | null> {
  const cacheKey = address.toLowerCase().trim();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const cleanAddress = cleanAddressForGeocoding(address);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(cleanAddress)}&format=json&addressdetails=1&limit=3&countrycodes=lt&accept-language=lt`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const item = data[0];
    const result = mapNominatimToResult(item);

    // Cache (LRU eviction)
    if (geocodeCache.size >= GEOCODE_CACHE_MAX) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) geocodeCache.delete(firstKey);
    }
    geocodeCache.set(cacheKey, result);

    return result;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode: given lat/lng, return the address at that location
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=lt`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.error) return null;

    return mapNominatimToResult(data);
  } catch {
    return null;
  }
}

// ── Address Suggestions ─────────────────────────────────────

/**
 * Search for Lithuanian address suggestions using Nominatim
 * Optimized with: AbortController (cancel stale), response cache
 */
export async function searchAddressSuggestions(
  query: string
): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) return [];

  const cacheKey = query.toLowerCase().trim();

  // Return cached result instantly
  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey)!;
  }

  // Cancel any previous in-flight request
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const currentController = activeAbortController;

  try {
    const timeout = setTimeout(() => currentController.abort(), 5000);

    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=lt&accept-language=lt`;

    const response = await fetch(url, {
      signal: currentController.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    // If user typed more and this request is stale, bail
    if (currentController !== activeAbortController) return [];

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const seen = new Set<string>();
    const results: AddressSuggestion[] = data
      .map((item: any) => {
        const addr = item.address || {};
        const street = addr.road || addr.pedestrian || '';
        const houseNumber = addr.house_number || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const district = addr.suburb || addr.district || '';
        const streetFull = [street, houseNumber].filter(Boolean).join(' ');
        const shortName = [streetFull, city].filter(Boolean).join(', ');

        return {
          display_name: item.display_name || shortName,
          short_name: shortName || item.display_name || '',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          city: city || undefined,
          postcode: addr.postcode || undefined,
          street: street || undefined,
          houseNumber: houseNumber || undefined,
          district: district || undefined,
        };
      })
      .filter((s: AddressSuggestion) => {
        if (!s.short_name || s.short_name.length === 0) return false;
        const key = `${s.short_name}|${s.postcode || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    // Cache result (LRU eviction)
    if (results.length > 0) {
      if (suggestionCache.size >= SUGGESTION_CACHE_MAX) {
        const firstKey = suggestionCache.keys().next().value;
        if (firstKey) suggestionCache.delete(firstKey);
      }
      suggestionCache.set(cacheKey, results);
    }

    return results;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return [];
    }
    return [];
  }
}

// ── Address Parsing ─────────────────────────────────────────

/**
 * Extract postal code from Lithuanian address format (LT-XXXXX or XXXXX)
 */
export function extractPostalCodeFromAddress(address: string): string | null {
  const postalCodeRegex = /(?:LT-)?(\d{5})/;
  const match = address.match(postalCodeRegex);
  return match ? match[1] : null;
}

/**
 * Parse Lithuanian address into components
 */
export function parseAddressComponents(address: string): {
  street?: string;
  number?: string;
  city?: string;
  postalCode?: string;
} {
  const cleaned = address.trim();

  const postalCode = extractPostalCodeFromAddress(cleaned);

  const withoutPostal = postalCode
    ? cleaned.replace(new RegExp(`(?:LT-)?${postalCode}[,\\s]*`, 'g'), '').trim()
    : cleaned;

  const parts = withoutPostal.split(',').map(p => p.trim()).filter(p => p);

  let street: string | undefined;
  let number: string | undefined;
  let city: string | undefined;

  if (parts.length >= 1) {
    const streetPart = parts[0];
    const streetMatch = streetPart.match(/^(.+?)\s+(\d+[a-zA-Z]*(?:[-/]\d+[a-zA-Z]*)*)$/);

    if (streetMatch) {
      street = streetMatch[1].trim();
      number = streetMatch[2].trim();
    } else {
      street = streetPart;
    }
  }

  if (parts.length >= 2) {
    city = parts[parts.length - 1];
  }

  return {
    street,
    number,
    city,
    postalCode: postalCode || undefined
  };
}

// ── Internal Helpers ────────────────────────────────────────

/** Clean address string for better geocoding results */
function cleanAddressForGeocoding(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,]{2,}/g, ',')
    .replace(/^,|,$/g, '');
}

/** Map a Nominatim response item to our GeocodingResult interface */
function mapNominatimToResult(item: any): GeocodingResult {
  const addr = item.address || {};
  const street = addr.road || addr.pedestrian || '';
  const houseNumber = addr.house_number || '';
  const city = addr.city || addr.town || addr.village || addr.county || '';
  const streetFull = [street, houseNumber].filter(Boolean).join(' ');
  const displayName = [streetFull, city].filter(Boolean).join(', ');

  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display_name: displayName || item.display_name || '',
    city,
    postcode: addr.postcode,
    formatted_address: displayName || item.display_name || '',
  };
}
