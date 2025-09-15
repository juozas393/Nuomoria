/* eslint-disable react/prop-types */
import React from 'react';
import { Droplets, Zap, Flame, Wifi, Trash2, Fan, ArrowUpDown } from 'lucide-react';

interface MeterIconProps {
  iconName: string;
  className?: string;
}

export const MeterIcon: React.FC<MeterIconProps> = React.memo(({ iconName, className = "w-4 h-4" }) => {
  switch (iconName) {
    case 'droplet': return <Droplets className={className} />;
    case 'bolt': return <Zap className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'wifi': return <Wifi className={className} />;
    case 'trash': return <Trash2 className={className} />;
    case 'fan': return <Fan className={className} />;
    case 'elevator': return <ArrowUpDown className={className} />;
    default: return <Zap className={className} />;
  }
});

MeterIcon.displayName = 'MeterIcon';

export default MeterIcon;