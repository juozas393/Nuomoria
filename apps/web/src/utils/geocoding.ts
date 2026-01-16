// Geocoding utilities using OpenStreetMap Nominatim API
// Free and open-source alternative to paid geocoding services

export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
  city?: string;
  postcode?: string;
  formatted_address: string;
}

export interface GeocodingError {
  message: string;
  code: 'NETWORK_ERROR' | 'NO_RESULTS' | 'INVALID_ADDRESS' | 'RATE_LIMIT';
}

/**
 * Geocode address using OpenStreetMap Nominatim API
 * Rate limited to 1 request per second as per OSM usage policy
 */
export async function geocodeAddress(
  address: string,
  country: string = 'Lithuania'
): Promise<GeocodingResult | null> {
  try {
    // Clean up the address for better results
    const cleanAddress = cleanAddressForGeocoding(address);
    
    // Format query for Nominatim
    const query = `${cleanAddress}, ${country}`;
    
    // Use Nominatim API with proper parameters
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'lt'); // Limit to Lithuania
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'PropertyManagement/1.0 (contact@example.com)', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village,
      postcode: result.address?.postcode,
      formatted_address: result.display_name
    };
    
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Clean address string for better geocoding results
 */
function cleanAddressForGeocoding(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[,]{2,}/g, ',') // Remove duplicate commas
    .replace(/^,|,$/g, ''); // Remove leading/trailing commas
}

/**
 * Extract postal code from Lithuania address format
 */
export function extractPostalCodeFromAddress(address: string): string | null {
  // Lithuanian postal codes are 5 digits: LT-XXXXX or just XXXXX
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
  
  // Extract postal code first
  const postalCode = extractPostalCodeFromAddress(cleaned);
  
  // Remove postal code from address for further parsing
  const withoutPostal = postalCode 
    ? cleaned.replace(new RegExp(`(?:LT-)?${postalCode}[,\\s]*`, 'g'), '').trim()
    : cleaned;
  
  // Split by commas to get parts
  const parts = withoutPostal.split(',').map(p => p.trim()).filter(p => p);
  
  let street: string | undefined;
  let number: string | undefined;
  let city: string | undefined;
  
  if (parts.length >= 1) {
    // First part is usually street and number
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
    // Last part is usually city
    city = parts[parts.length - 1];
  }
  
  return {
    street,
    number,
    city,
    postalCode: postalCode || undefined // Convert null to undefined
  };
}

/**
 * Rate limiter for geocoding requests
 * Ensures we don't exceed 1 request per second (Nominatim policy)
 */
class RateLimiter {
  private lastRequest = 0;
  private readonly minInterval = 1000; // 1 second
  
  async waitForNext(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

/**
 * Rate-limited geocoding function
 */
export async function geocodeAddressWithRateLimit(
  address: string,
  country?: string
): Promise<GeocodingResult | null> {
  await rateLimiter.waitForNext();
  return geocodeAddress(address, country);
}
