import React, { createContext, useContext } from 'react';

/**
 * CardBgContext — provides the resolved card background style
 * to all child components within TenantDetailModalPro.
 * 
 * Priority: apartment extended_details.card_background → address buildingInfo.card_background → default
 */

const DEFAULT_IMAGE = '/images/CardsBackground.webp';

/**
 * Extracts the raw background image URL from property/address data.
 */
export const resolveCardBgImage = (property?: any, address?: any): string => {
  // 1. Check property specific override
  if (property?.extended_details?.card_background) {
    const bg = property.extended_details.card_background;
    return bg.startsWith('/') ? bg : `/images/${bg}`;
  }

  // 2. Check address settings
  // NOTE: Supabase returns address_settings as a SINGLE OBJECT (not array)
  // because address_settings has a UNIQUE constraint on address_id.
  const raw = address?.address_settings || property?.address?.address_settings;
  if (raw) {
    // Normalize: could be an object {…} or an array [{…}]
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (s) {
      // DB format: building_info.card_background (direct from Supabase join)
      const bg = s?.building_info?.card_background
        // Frontend format: settings.buildingInfo.card_background (transformed by adapter)
        || s?.settings?.buildingInfo?.card_background;
      if (bg) {
        return bg.startsWith('/') ? bg : `/images/${bg}`;
      }
    }
  }

  // 3. Fallback
  return DEFAULT_IMAGE;
};

/**
 * Returns a full React.CSSProperties object with the background image
 * and the dark gradient overlay.
 */
export const resolveCardBgStyle = (property?: any, address?: any): React.CSSProperties => {
  const imageUrl = resolveCardBgImage(property, address);
  
  return {
    backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.8) 100%), url('${imageUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
};

/**
 * Light variant — white gradient overlay for rows where text is dark (gray-900).
 * Used for apartment rows on Dashboard.
 */
export const resolveCardBgStyleLight = (property?: any, address?: any): React.CSSProperties => {
  const imageUrl = resolveCardBgImage(property, address);
  
  return {
    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.78) 50%, rgba(255,255,255,0.85) 100%), url('${imageUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
};

const DEFAULT_STYLE: React.CSSProperties = {
  backgroundImage: `url('${DEFAULT_IMAGE}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const CardBgContext = createContext<React.CSSProperties>(DEFAULT_STYLE);

export const CardBgProvider = CardBgContext.Provider;

export const useCardBg = (): React.CSSProperties => useContext(CardBgContext);

export default CardBgContext;
