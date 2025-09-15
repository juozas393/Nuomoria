import React from 'react';
import { ChartBarIcon, BuildingOfficeIcon, HomeIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface PropertyTypeDistributionProps {
  apartments: number;
  houses: number;
  commercial: number;
  totalProperties: number;
}

const PropertyTypeDistribution: React.FC<PropertyTypeDistributionProps> = ({
  apartments,
  houses,
  commercial,
  totalProperties
}) => {
  const types = [
    {
      name: 'Butai',
      count: apartments,
      percentage: totalProperties > 0 ? (apartments / totalProperties) * 100 : 0,
      icon: BuildingOfficeIcon,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    {
      name: 'Namai',
      count: houses,
      percentage: totalProperties > 0 ? (houses / totalProperties) * 100 : 0,
      icon: HomeIcon,
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200'
    },
    {
      name: 'Komerciniai',
      count: commercial,
      percentage: totalProperties > 0 ? (commercial / totalProperties) * 100 : 0,
      icon: ShoppingBagIcon,
      gradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg">
          <ChartBarIcon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white drop-shadow-lg">Nuosavybių Tipai</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {types.map((type, index) => (
          <div
            key={index}
            className={`group relative overflow-hidden rounded-xl bg-white border ${type.borderColor} shadow-lg hover:shadow-xl transition-all duration-200 ${type.bgColor}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${type.gradient} shadow-md group-hover:shadow-lg transition-shadow duration-200`}>
                  {React.createElement(type.icon, { className: "w-6 h-6 text-white" })}
                </div>
                <div className={`text-2xl font-bold ${type.textColor}`}>
                  {type.count}
                </div>
              </div>
              
              <h3 className={`font-semibold ${type.textColor} mb-4`}>
                {type.name}
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Procentas</span>
                  <span className={`font-semibold ${type.textColor}`}>
                    {type.percentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${type.gradient} transition-all duration-500 group-hover:shadow-lg`}
                    style={{ width: `${type.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyTypeDistribution; 