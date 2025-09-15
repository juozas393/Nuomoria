import { 
  Droplet, 
  Zap, 
  Flame, 
  Wind, 
  Wifi, 
  Trash2,
  TowerControl,
  type LucideIcon 
} from 'lucide-react';

export type MeterType = 'water_cold' | 'water_hot' | 'electric_ind' | 'heating' | 'gas' | 'ventilation' | 'internet' | 'waste' | 'elevator';

export const getMeterIcon = (type: MeterType): LucideIcon => {
  switch (type) {
    case 'water_cold':
    case 'water_hot':
      return Droplet;
    case 'electric_ind':
      return Zap;
    case 'heating':
    case 'gas':
      return Flame;
    case 'ventilation':
      return Wind;
    case 'internet':
      return Wifi;
    case 'waste':
      return Trash2;
    case 'elevator':
      return TowerControl;
    default:
      return Zap;
  }
};

export const getMeterColor = (type: MeterType): string => {
  switch (type) {
    case 'water_cold':
    case 'water_hot':
      return 'text-blue-500';
    case 'electric_ind':
      return 'text-yellow-500';
    case 'heating':
    case 'gas':
      return 'text-orange-500';
    case 'ventilation':
      return 'text-gray-500';
    case 'internet':
      return 'text-purple-500';
    case 'waste':
      return 'text-red-500';
    case 'elevator':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

export const getMeterName = (type: MeterType): string => {
  switch (type) {
    case 'water_cold':
      return 'Šaltas vanduo';
    case 'water_hot':
      return 'Karštas vanduo';
    case 'electric_ind':
      return 'Elektra';
    case 'heating':
      return 'Šildymas';
    case 'gas':
      return 'Dujos';
    case 'ventilation':
      return 'Vėdinimas';
    case 'internet':
      return 'Internetas';
    case 'waste':
      return 'Šiukšlės';
    case 'elevator':
      return 'Liftas';
    default:
      return 'Skaitliukas';
  }
};
