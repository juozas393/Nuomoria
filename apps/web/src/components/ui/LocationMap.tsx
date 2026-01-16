import React, { useState, useEffect } from 'react';
import { MapPinIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface LocationMapProps {
  lat?: number;
  lng?: number;
  address: string;
  onLocationConfirm: (lat: number, lng: number) => void;
  onLocationReject: () => void;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  lat,
  lng,
  address,
  onLocationConfirm,
  onLocationReject
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!lat || !lng) {
    return null;
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.001},${lat-0.001},${lng+0.001},${lat+0.001}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Patikrinti vietą</h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onLocationConfirm(lat, lng)}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
          >
            <CheckIcon className="h-3 w-3" />
            <span>Patvirtinti</span>
          </button>
          <button
            onClick={onLocationReject}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
          >
            <XMarkIcon className="h-3 w-3" />
            <span>Atmesti</span>
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        {address}
      </div>
      
      <div className="relative">
        <iframe
          src={mapUrl}
          className="w-full h-48 border border-gray-300 rounded"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
          <MapPinIcon className="h-3 w-3 inline mr-1" />
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Jei vieta neteisinga, galite pataisyti adresą ir bandyti iš naujo
      </div>
    </div>
  );
};



