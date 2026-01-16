import React, { useMemo } from 'react';
import { BuildingOfficeIcon, MapPinIcon, UsersIcon, CalendarIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const translateBuildingType = (type?: string | null) => {
  if (!type) return null;
  switch (type.toLowerCase()) {
    case 'apartment':
    case 'flat':
      return 'Butų namas';
    case 'house':
      return 'Individualus namas';
    case 'commercial':
      return 'Komercinis pastatas';
    case 'office':
      return 'Biurų pastatas';
    default:
      return type;
  }
};

interface AddressCardProps {
  address: {
    id: string;
    full_address: string;
    total_apartments: number;
    floors: number;
    building_type: string;
    year_built?: number;
    chairman_name?: string;
    chairman_phone?: string;
    chairman_email?: string;
  };
  tenantCount: number;
  onSelect: (address: AddressCardProps['address']) => void;
  isSelected?: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, tenantCount, onSelect, isSelected = false }) => {
  const { occupancy, freeUnits, stats } = useMemo(() => {
    const total = Math.max(address.total_apartments, 1);
    const occupancyPercent = Math.min(100, Math.round((tenantCount / total) * 100));
    const free = Math.max(total - tenantCount, 0);

    const baseStats: Array<{ icon: React.ElementType; label: string; value: string }> = [
      { icon: UsersIcon, label: 'Butų', value: String(address.total_apartments) },
      { icon: MapPinIcon, label: 'Aukštų', value: String(address.floors) },
    ];

    if (address.year_built) {
      baseStats.push({ icon: CalendarIcon, label: 'Pastatytas', value: String(address.year_built) });
    }

    return {
      occupancy: occupancyPercent,
      freeUnits: free,
      stats: baseStats,
    };
  }, [address, tenantCount]);

  const handleActivate = () => {
    onSelect(address);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-300 ease-out will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8481]
        ${isSelected 
          ? 'border-[#2F8481] bg-white shadow-[0_28px_56px_rgba(47,132,129,0.32)]'
          : 'border-black/5 bg-white hover:-translate-y-1 hover:shadow-[0_24px_38px_rgba(0,0,0,0.16)]'}`}
    >
      {!isSelected && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-[#2F8481]/18 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      <div className="relative z-10 flex h-full flex-col">

        <div className="flex items-start gap-4 px-6 pt-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F8481]/10">
            <BuildingOfficeIcon className="h-6 w-6 text-[#2F8481]" />
          </span>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold leading-tight text-black truncate max-w-full">
                {address.full_address}
              </h3>
              {address.building_type && (
                <span className="inline-flex items-center rounded-full border border-[#2F8481]/30 bg-[#2F8481]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2F8481]">
                  {translateBuildingType(address.building_type)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white/80 px-3 py-2 text-sm text-black/70 transition-colors duration-300 group-hover:border-[#2F8481]/20 group-hover:bg-white"
                  >
                    <Icon className="h-4 w-4 text-[#2F8481]" />
                    <div className="leading-tight">
                      <div className="font-semibold text-black">{stat.value}</div>
                      <div className="text-[11px] uppercase tracking-wide text-black/50">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="rounded-2xl border border-black/5 bg-white/85 p-4 transition-colors duration-300 group-hover:border-[#2F8481]/20 group-hover:bg-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">Užimtumas</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-semibold text-[#2F8481]">{occupancy}%</span>
                  <span className="text-sm text-black/50">({tenantCount} iš {address.total_apartments} butų)</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">Laisvi butai</p>
                <span className="text-lg font-semibold text-black">{freeUnits}</span>
              </div>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-black/10">
              <div
                className="h-2 rounded-full bg-[#2F8481] transition-all duration-500"
                style={{ width: `${Math.max(occupancy, 6)}%` }}
              />
            </div>
          </div>
              </div>
              
        {(address.chairman_name || address.chairman_phone || address.chairman_email) && (
          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm text-black/70 transition-colors duration-300 group-hover:border-[#2F8481]/20 group-hover:bg-white">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-black/45">Kontaktinis asmuo</p>
              <div className="flex flex-wrap items-center gap-4">
                {address.chairman_name && <span className="font-semibold text-black">{address.chairman_name}</span>}
                {address.chairman_phone && (
                  <span className="inline-flex items-center gap-1 text-black/60">
                    <PhoneIcon className="h-4 w-4" />
                    {address.chairman_phone}
                </span>
                )}
                {address.chairman_email && (
                  <span className="inline-flex items-center gap-1 text-black/60">
                    <EnvelopeIcon className="h-4 w-4" />
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">{address.chairman_email}</span>
                  </span>
                )}
              </div>
            </div>
              </div>
            )}

        <div className="mt-auto flex items-center justify-between border-t border-black/5 bg-white/80 px-6 py-3 text-xs text-black/50 transition-colors duration-300 group-hover:bg-white">
          <span>Paspauskite, kad peržiūrėtumėte nuomininkus</span>
          <span className={`inline-flex h-2 w-2 rounded-full transition-opacity duration-200 ${
            isSelected ? 'bg-[#2F8481]' : 'bg-[#2F8481] opacity-0 group-hover:opacity-100'
          }`} />
        </div>
      </div>
    </div>
  );
};

export default AddressCard;
