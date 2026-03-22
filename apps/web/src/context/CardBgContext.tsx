import React, { createContext, useContext } from 'react';

/**
 * CardBgContext — provides the resolved card background style
 * to all child components within TenantDetailModalPro.
 * 
 * Priority: apartment extended_details.card_background → address buildingInfo.card_background → default
 */

const DEFAULT_IMAGE = '/images/CardsBackground.webp';

/**
 * Extract address settings object (normalized).
 */
const getAddressSettingsObj = (property?: any, address?: any) => {
  const raw = address?.address_settings || property?.address?.address_settings;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
};

/**
 * Resolve the custom background position (0-100%) from address settings.
 */
const resolvePosition = (property?: any, address?: any): string => {
  const s = getAddressSettingsObj(property, address);
  const pos = s?.building_info?.card_background_position
    ?? s?.settings?.buildingInfo?.card_background_position;
  if (pos != null && typeof pos === 'number') {
    return `center ${pos}%`;
  }
  return 'center 50%';
};

/**
 * Resolve the custom opacity (5-60%) from address settings.
 * Returns the white overlay value (1 - opacity/100).
 * E.g. opacity=15 → overlay=0.85 (very subtle image), opacity=60 → overlay=0.40 (very visible).
 */
const resolveOverlay = (property?: any, address?: any): number => {
  const s = getAddressSettingsObj(property, address);
  const opacity = s?.building_info?.card_background_opacity
    ?? s?.settings?.buildingInfo?.card_background_opacity;
  if (opacity != null && typeof opacity === 'number') {
    return 1 - (opacity / 100);
  }
  return 0.85; // default: 15% opacity = 0.85 overlay
};

/**
 * Extracts the raw background image URL from property/address data.
 */
export const resolveCardBgImage = (property?: any, address?: any): string => {
  // 1. Check property specific override (must be a non-empty string)
  const propBg = property?.extended_details?.card_background;
  if (propBg && typeof propBg === 'string' && propBg.trim() !== '') {
    if (propBg === 'none') return 'none';
    return propBg.startsWith('/') ? propBg : `/images/${propBg}`;
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
      if (bg && typeof bg === 'string' && bg.trim() !== '') {
        if (bg === 'none') return 'none';
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

  // Plain white / no background
  if (imageUrl === 'none') {
    return {
      backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.85) 100%)',
      backgroundColor: '#1a1a2e',
    };
  }

  const position = resolvePosition(property, address);
  const overlay = resolveOverlay(property, address);
  // For dark variant, invert: more image opacity = less dark overlay
  const darkOverlay = Math.max(0.15, overlay * 0.7);

  return {
    backgroundImage: `linear-gradient(to top, rgba(0,0,0,${Math.min(0.85, darkOverlay + 0.25)}) 0%, rgba(0,0,0,${darkOverlay}) 50%, rgba(0,0,0,${Math.min(0.85, darkOverlay + 0.25)}) 100%), url('${imageUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: position,
  };
};

/**
 * Light variant — white gradient overlay for rows where text is dark (gray-900).
 * Used for apartment rows on Dashboard and modal sections.
 */
export const resolveCardBgStyleLight = (property?: any, address?: any): React.CSSProperties => {
  const imageUrl = resolveCardBgImage(property, address);

  // Plain white / no background
  if (imageUrl === 'none') {
    return { backgroundColor: '#ffffff' };
  }

  const position = resolvePosition(property, address);
  const overlay = resolveOverlay(property, address);

  return {
    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${overlay}) 0%, rgba(255,255,255,${Math.max(0, overlay - 0.03)}) 50%, rgba(255,255,255,${Math.min(1, overlay + 0.02)}) 100%), url('${imageUrl}')`,
    backgroundSize: 'cover',
    backgroundPosition: position,
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
