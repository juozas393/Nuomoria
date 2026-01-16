import React, { memo, useMemo } from 'react';
import { 
  MapPinIcon,
  CurrencyEuroIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { Tenant } from '../../types/tenant';

interface TenantCardProps {
  tenant: Tenant;
  isSelected: boolean;
  onClick: (tenant: Tenant) => void;
  onChatClick?: (address: string) => void;
}

const formatCurrency = (amount?: number | null) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('lt-LT');
};

const getInitials = (fullName?: string | null) => {
  if (!fullName) return 'T';
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 0) return 'T';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const TenantCard: React.FC<TenantCardProps> = memo(({ tenant, isSelected, onClick, onChatClick }) => {
  const paymentStatus = useMemo(() => {
    if (tenant.payment_status === 'overdue' || (tenant.outstanding_amount ?? 0) > 0) {
      return {
        label: 'Yra įsiskolinimas',
        tone: 'border border-black/15 bg-black/10 text-black',
      } as const;
    }
    if (tenant.payment_status === 'unpaid') {
      return {
        label: 'Neapmokėta',
        tone: 'border border-black/15 bg-black/10 text-black',
      } as const;
    }
    return {
      label: 'Mokėjimai tvarkoje',
      tone: 'border border-[#2F8481]/30 bg-[#2F8481]/10 text-[#2F8481]',
    } as const;
  }, [tenant.payment_status, tenant.outstanding_amount]);

  const contractStatus = useMemo(() => {
    if (!tenant.contractEnd) return 'Sutarties pabaiga nenustatyta';
    const endDate = new Date(tenant.contractEnd);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const dayDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (Number.isNaN(dayDiff)) return 'Sutarties pabaiga nenustatyta';
    if (dayDiff < 0) return 'Sutartis pasibaigė';
    if (dayDiff === 0) return 'Baigiasi šiandien';
    if (dayDiff <= 30) return `Baigiasi po ${dayDiff} d.`;
    return `Baigiasi ${formatDate(tenant.contractEnd)}`;
  }, [tenant.contractEnd]);

  const metaStats = useMemo(
    () => [
      { label: 'Nuomos kaina', value: `${formatCurrency(tenant.monthlyRent)}/mėn.` },
      { label: 'Depozitas', value: formatCurrency(tenant.deposit) },
      { label: 'Paskutinė įmoka', value: formatDate(tenant.last_payment_date) },
    ],
    [tenant.monthlyRent, tenant.deposit, tenant.last_payment_date]
  );

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={() => onClick(tenant)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(tenant);
        }
      }}
      aria-pressed={isSelected}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8481]
        ${isSelected
          ? 'border-[#2F8481] bg-white shadow-[0_24px_44px_rgba(47,132,129,0.32)]'
          : 'border-black/5 bg-white hover:-translate-y-1 hover:shadow-[0_24px_38px_rgba(0,0,0,0.12)]'}`}
    >
      {!isSelected && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-[#2F8481]/16 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      <div className="relative z-10 flex h-full flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2F8481]/30 bg-[#2F8481]/10 text-lg font-semibold text-[#2F8481]">
              {getInitials(tenant.name)}
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-black leading-tight">{tenant.name}</p>
              <p className="text-sm text-black/60">Butas {tenant.apartmentNumber}</p>
              <p className="flex items-center gap-2 text-xs text-black/50">
                <MapPinIcon className="h-4 w-4" />
                <span className="truncate max-w-[180px] sm:max-w-[260px]">{tenant.address}</span>
              </p>
            </div>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatus.tone}`}>
            {paymentStatus.label}
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-3">
          {metaStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm text-black/70"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-black/40">{stat.label}</p>
              <p className="mt-1 font-semibold text-black">{stat.value}</p>
            </div>
          ))}
        </div>
        
        <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm text-black/70">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2F8481]/30 bg-[#2F8481]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2F8481]">
              {contractStatus}
            </span>
            {tenant.auto_renewal_enabled && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2F8481]/30 bg-[#2F8481]/10 px-3 py-1 text-xs font-semibold text-[#2F8481]">
                Automatinis pratęsimas
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-black/70">
              <PhoneIcon className="h-4 w-4" />
              {tenant.phone || '—'}
            </div>
            <div className="flex items-center gap-2 text-sm text-black/70">
              <EnvelopeIcon className="h-4 w-4" />
              <span className="truncate max-w-[200px] sm:max-w-none">{tenant.email || '—'}</span>
            </div>
        </div>
        </div>
        
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-black/50">
            <CalendarIcon className="h-4 w-4" />
            <span>Sutartis: {formatDate(tenant.contractStart)} – {formatDate(tenant.contractEnd)}</span>
          </div>
          <div className="flex items-center gap-3">
        {onChatClick && (
          <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
              onChatClick(tenant.address);
            }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2F8481]/30 bg-[#2F8481]/10 px-4 py-2 text-sm font-semibold text-[#2F8481] transition-colors hover:bg-[#2F8481]/20"
          >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Pokalbis
          </button>
        )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick(tenant);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2F8481] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F8481]/90"
            >
              <EyeIcon className="h-4 w-4" />
              Peržiūrėti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TenantCard.displayName = 'TenantCard';

export default TenantCard; 