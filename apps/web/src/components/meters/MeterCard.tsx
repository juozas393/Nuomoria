/**
 * ultimate_performance_rules:
 * - Diagnose root cause, not patch symptom
 * - Meet Core Web Vitals thresholds
 * - Optimize images: WebP/AVIF, srcset, lazy, dimension attrs
 * - Keep bundles small, defer noncritical JS
 * - Minimize DOM size, use virtualization
 * - Cache aggressively: HTTP/2, CDN, ServiceWorkers
 * - Real-time performance monitoring setup
 * - Balance performance vs maintainability decisions
 * - Always ask before ambiguous fixes
 * - Continuous image and perf auditing process
 */

import React from 'react';
import { Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { MeterIcon } from '../ui/MeterIcon';
import { Meter } from '../../types/meters';
import { fmtPriceLt, getUnitLabel, getDistributionLabel } from '../../constants/meterTemplates';

interface MeterCardProps {
  meter: Meter;
  onEdit?: (meter: Meter) => void;
  onDelete?: (meterId: string) => void;
  onToggleActive?: (meterId: string, isActive: boolean) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const MeterCard: React.FC<MeterCardProps> = React.memo(({
  meter,
  onEdit,
  onDelete,
  onToggleActive,
  showActions = true,
  compact = false
}) => {
  // Use legacy compatibility fields
  const meterName = meter.name || meter.title;
  const meterType = meter.type || (meter.mode === 'individual' ? 'individual' : 'communal');
  const meterIcon = meter.icon || meter.kind;
  const meterDescription = meter.description;
  const meterFixedPrice = meter.fixed_price;
  const meterPricePerUnit = meter.price_per_unit || meter.price;
  const meterDistributionMethod = meter.distribution_method;
  const meterRequiresPhoto = meter.requires_photo || meter.photoRequired;
  const meterIsActive = meter.is_active !== undefined ? meter.is_active : meter.active;
  const meterIsCustom = meter.is_custom;
  const meterIsInherited = meter.is_inherited;

  if (compact) {
    return (
      <div className={`p-3 border rounded-lg transition-colors ${
        meterIsActive 
          ? 'border-gray-200 bg-white' 
          : 'border-gray-100 bg-gray-50 opacity-60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2F8481]/10 rounded flex items-center justify-center">
              <MeterIcon iconName={meterIcon || 'bolt'} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{meterName}</h4>
              <p className="text-xs text-gray-500">
                {meterType === 'individual' ? 'Individualus' : 'Bendras'} • {getUnitLabel(meter.unit)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {meter.distribution_method === 'fixed_split' 
                ? `${meterFixedPrice?.toFixed(2) || '0.00'} €/mėn.`
                : `${meterPricePerUnit?.toFixed(2) || '0.00'} €/${getUnitLabel(meter.unit)}`
              }
            </div>
            {!meterIsActive && (
              <span className="text-xs text-red-500">Neaktyvus</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg transition-colors ${
      meterIsActive 
        ? 'border-gray-200 bg-white shadow-sm hover:shadow-md' 
        : 'border-gray-100 bg-gray-50 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
              <MeterIcon iconName={meterIcon || 'bolt'} className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{meterName}</h4>
              {meterDescription && (
                <p className="text-sm text-gray-600">{meterDescription}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tipas:</span>
              <div className="mt-1">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  meterType === 'individual' 
                    ? 'bg-[#2F8481]/10 text-[#2F8481]' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {meterType === 'individual' ? 'Individualus' : 'Bendras'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-gray-500">Vienetas:</span>
              <div className="mt-1 text-gray-900">
                {getUnitLabel(meter.unit)}
              </div>
            </div>

            <div>
              <span className="text-gray-500">Kaina:</span>
              <div className="mt-1 font-medium text-gray-900">
                {meter.distribution_method === 'fixed_split' 
                  ? `${meterFixedPrice?.toFixed(2) || '0.00'} €/mėn.`
                  : `${meterPricePerUnit?.toFixed(2) || '0.00'} €/${getUnitLabel(meter.unit)}`
                }
              </div>
            </div>

            <div>
              <span className="text-gray-500">Paskirstymas:</span>
              <div className="mt-1 text-gray-900">
                {meterDistributionMethod && getDistributionLabel(
                  meterDistributionMethod === 'per_apartment' ? 'pagal_suvartojima' :
                  meterDistributionMethod === 'per_area' ? 'pagal_butus' :
                  'fiksuota'
                )}
              </div>
            </div>
          </div>

          {meterRequiresPhoto && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                Reikia nuotraukos
              </span>
            </div>
          )}

          {meterIsCustom && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                Pritaikytas
              </span>
            </div>
          )}

          {meterIsInherited && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                Paveldėtas
              </span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(meter)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                title="Redaguoti"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            
            {onToggleActive && (
              <button
                onClick={() => onToggleActive(meter.id, !meterIsActive)}
                className={`p-2 rounded-lg transition-colors ${
                  meterIsActive
                    ? 'hover:bg-red-50 text-red-600 hover:text-red-700'
                    : 'hover:bg-green-50 text-green-600 hover:text-green-700'
                }`}
                title={meterIsActive ? 'Deaktyvuoti' : 'Aktyvuoti'}
              >
                {meterIsActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(meter.id)}
                className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-600 hover:text-red-700"
                title="Ištrinti"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

MeterCard.displayName = 'MeterCard';
