import React from 'react';

// Brand mygtukai
export const Button = ({
  variant = 'outline',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'brand' | 'outline'
}) => (
  <button
    type="button"
    className={[
      'h-10 rounded-lg px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2F8481]/50',
      variant === 'brand'
        ? 'bg-[#2F8481] text-white hover:bg-[#2A7875]'
        : 'border border-black/15 text-black hover:bg-black/[0.03]',
      className,
    ].join(' ')}
    {...props}
  />
);

// Minimalios statistikos kortelės
export const StatCard = ({
  title,
  value,
  icon
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-xl border border-black/10 bg-white p-4">
    <div className="flex items-start gap-3">
      {icon && <div className="text-xl">{icon}</div>}
      <div className="min-w-0">
        <div className="text-2xl font-bold tabular-nums text-[#2F8481] leading-tight">{value}</div>
        <div className="text-sm text-black/70 mt-1">{title}</div>
      </div>
    </div>
  </div>
);

// Navigacijos plytelės
export const NavTile = ({
  label,
  icon,
  onClick,
  badge
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}) => (
  <button
    onClick={onClick}
    className="relative rounded-xl border border-black/10 bg-white p-4 text-left
               hover:bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40"
  >
    {badge && (
      <span className="absolute -top-2 -right-2 text-xs font-semibold bg-white border border-black/10 rounded-full px-2 py-0.5 shadow-sm">
        {badge}
      </span>
    )}
    <div className="text-xl mb-2">{icon}</div>
    <div className="text-sm font-medium text-black">{label}</div>
  </button>
);

// Dešinės pusės grupė (vienodas ritmas)
export const SidebarGroup: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="rounded-xl border border-black/10 bg-white p-4">
    <h4 className="text-base font-semibold text-black mb-3">{title}</h4>
    <div className="[&_.row]:flex [&_.row]:justify-between [&_.row]:items-center [&_.row]:py-1.5
                    [&_.row_label]:text-black/60 [&_.row_value]:tabular-nums">
      {children}
    </div>
  </section>
);

// "Būsto apžvalga" – clean definition list
export const Dl = ({ items }: { items: [string, string][] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
    {items.map(([label, value]) => (
      <div key={label} className="flex justify-between items-center py-2 border-b border-black/5 last:border-none">
        <span className="text-black/70">{label}</span>
        <span className="font-medium text-black">{value}</span>
      </div>
    ))}
  </div>
);

// Tabs – brand underline, be spalvų blokų
export const Tabs = ({
  items,
  active,
  onChange
}: {
  items: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) => (
  <div className="border-b border-black/10">
    <div className="flex gap-4 px-2">
      {items.map(tab => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={[
              'relative py-3 text-sm font-medium',
              selected ? 'text-[#2F8481]' : 'text-black/70 hover:text-black',
            ].join(' ')}
          >
            {tab.label}
            <span className={[
              'absolute left-0 right-0 -bottom-[1px] h-[2px] rounded',
              selected ? 'bg-[#2F8481]' : 'bg-transparent'
            ].join(' ')} />
          </button>
        );
      })}
    </div>
  </div>
);

// ====== KOMPAKTIŠKAS NUOMININKO RODYMAS ======

// Kompaktiška informacijos eilutė
export const InfoRow = ({
  label,
  value,
  status,
  className = ''
}: {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}) => (
  <div className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 ${className}`}>
    <span className="text-sm text-gray-600 min-w-0 flex-1">{label}</span>
    <div className="flex items-center gap-2 ml-4">
      <span className="text-sm font-medium text-gray-900 tabular-nums">{value}</span>
      {status && (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status === 'success' ? 'bg-green-100 text-green-700' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
          }`}>
          {status === 'success' ? '✓' :
            status === 'warning' ? '⚠' :
              status === 'error' ? '✗' : '•'}
        </span>
      )}
    </div>
  </div>
);

// Kompaktiška finansų kortelė
export const CompactFinanceCard = ({
  title,
  items,
  total,
  totalLabel,
  className = ''
}: {
  title: string;
  items: Array<{ label: string; value: number; status?: 'success' | 'warning' | 'error' }>;
  total?: number;
  totalLabel?: string;
  className?: string;
}) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
    <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
    <div className="space-y-2">
      {items.map((item, index) => (
        <InfoRow
          key={index}
          label={item.label}
          value={new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(item.value)}
          status={item.status}
        />
      ))}
      {total !== undefined && (
        <div className="pt-2 border-t border-gray-200">
          <InfoRow
            label={totalLabel || 'Iš viso'}
            value={new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(total)}
            className="font-semibold text-gray-900"
          />
        </div>
      )}
    </div>
  </div>
);

// Kompaktiška skaitliukų kortelė
export const CompactMetersCard = ({
  meters,
  onViewAll,
  className = ''
}: {
  meters: Array<{ id: string; kind: string; lastReading: string; status: 'approved' | 'pending' | 'missing' }>;
  onViewAll: () => void;
  className?: string;
}) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-800">Skaitliukai</h3>
      <button
        onClick={onViewAll}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        Visi ({meters.length})
      </button>
    </div>
    <div className="space-y-2">
      {meters.slice(0, 3).map(meter => (
        <div key={meter.id} className="flex items-center justify-between py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-600 truncate">{meter.kind}</div>
            <div className="text-sm font-medium text-gray-900">{meter.lastReading || '—'}</div>
          </div>
          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${meter.status === 'approved' ? 'bg-green-100 text-green-700' :
              meter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
            }`}>
            {meter.status === 'approved' ? '✓' :
              meter.status === 'pending' ? '⏳' : '✗'}
          </span>
        </div>
      ))}
      {meters.length > 3 && (
        <div className="text-xs text-gray-500 text-center pt-1">
          +{meters.length - 3} daugiau
        </div>
      )}
    </div>
  </div>
);

// Kompaktiška nuomininko kortelė - VISA INFORMACIJA VIENAME VIETOJE
export const CompactTenantCard = ({
  tenant,
  onEdit,
  onDelete,
  onInvoice,
  onAddPayment,
  onRefund,
  className = ''
}: {
  tenant: {
    name: string;
    email: string;
    phone: string;
    moveInDate: string;
    status: 'active' | 'inactive' | 'pending';
    finance: {
      monthlyRent: number;
      deposit: number;
      paidThisMonth: number;
      totalDebt: number;
    };
    property: {
      address: string;
      rooms: number;
      area: number;
      floor: number;
    };
    meters: Array<{ id: string; kind: string; lastReading: string; status: 'approved' | 'pending' | 'missing' }>;
    moveOut?: {
      notice: string;
      planned: string;
    };
  };
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
  onAddPayment: () => void;
  onRefund: () => void;
  className?: string;
}) => {
  const refundable = Math.max(0, tenant.finance.deposit - tenant.finance.totalDebt);
  const approvedMeters = tenant.meters.filter(m => m.status === 'approved').length;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Viršutinė eilutė - nuomininko pagrindinė informacija */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{tenant.name}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{tenant.email}</span>
            <span>•</span>
            <span>{tenant.phone}</span>
            <span>•</span>
            <span>Įsikėlė: {new Date(tenant.moveInDate).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Redaguoti
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            Ištrinti
          </button>
        </div>
      </div>

      {/* KPI juosta - kompaktiška */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.monthlyRent)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Nuoma</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.paidThisMonth)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Sumokėta</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Skola</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.deposit)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Depozitas</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-green-600 tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(refundable)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Grąžinti</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-[#2F8481] tabular-nums">
            {approvedMeters}/{tenant.meters.length}
          </div>
          <div className="text-xs text-gray-600 mt-1">Skaitliukai</div>
        </div>
      </div>

      {/* Pagrindinė informacija - 3 kolonos kompaktiškai */}
      <div className="grid grid-cols-3 gap-6">
        {/* Būsto informacija */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Būsto informacija</h3>
          <div className="space-y-2 text-sm">
            <InfoRow label="Adresas" value={tenant.property.address} />
            <InfoRow label="Kambariai" value={tenant.property.rooms} />
            <InfoRow label="Plotas" value={`${tenant.property.area} m²`} />
            <InfoRow label="Aukštas" value={tenant.property.floor} />
          </div>
        </div>

        {/* Skaitliukai */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Skaitliukai</h3>
          <div className="space-y-2">
            {tenant.meters.slice(0, 4).map(meter => (
              <div key={meter.id} className="flex items-center justify-between py-1">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-600 truncate">{meter.kind}</div>
                  <div className="text-sm font-medium">{meter.lastReading || '—'}</div>
                </div>
                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${meter.status === 'approved' ? 'bg-green-100 text-green-700' :
                    meter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {meter.status === 'approved' ? '✓' :
                    meter.status === 'pending' ? '⏳' : '✗'}
                </span>
              </div>
            ))}
            {tenant.meters.length > 4 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{tenant.meters.length - 4} daugiau
              </div>
            )}
          </div>
        </div>

        {/* Veiksmai ir papildoma informacija */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Veiksmai</h3>
          <div className="space-y-2">
            <button
              onClick={onInvoice}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              Išrašyti sąskaitą
            </button>
            <button
              onClick={onAddPayment}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              + Pridėti mokėjimą
            </button>
            <button
              onClick={onRefund}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
            >
              Grąžinti depozitą
            </button>
          </div>

          {tenant.moveOut && (
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Išsikraustymas</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pranešimas:</span>
                  <span>{new Date(tenant.moveOut.notice).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Planuojama:</span>
                  <span>{new Date(tenant.moveOut.planned).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ====== ULTRA KOMPAKTIŠKAS NUOMININKO RODYMAS ======

// Ultra kompaktiška nuomininko kortelė - Maksimaliai informatyvi, minimaliai vietos
export const UltraCompactTenantCard = ({
  tenant,
  onEdit,
  onDelete,
  onInvoice,
  onAddPayment,
  onRefund,
  className = ''
}: {
  tenant: {
    name: string;
    email: string;
    phone: string;
    moveInDate: string;
    status: 'active' | 'inactive' | 'pending';
    finance: {
      monthlyRent: number;
      deposit: number;
      paidThisMonth: number;
      totalDebt: number;
    };
    property: {
      address: string;
      rooms: number;
      area: number;
      floor: number;
    };
    meters: Array<{ id: string; kind: string; lastReading: string; status: 'approved' | 'pending' | 'missing' }>;
    moveOut?: {
      notice: string;
      planned: string;
    };
  };
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
  onAddPayment: () => void;
  onRefund: () => void;
  className?: string;
}) => {
  const refundable = Math.max(0, tenant.finance.deposit - tenant.finance.totalDebt);
  const approvedMeters = tenant.meters.filter(m => m.status === 'approved').length;
  const debtStatus = tenant.finance.totalDebt > 0 ? 'error' : 'success';
  const metersStatus = approvedMeters === tenant.meters.length ? 'success' :
    approvedMeters > 0 ? 'warning' : 'error';

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      {/* Viršutinė eilutė - nuomininko pagrindinė informacija + veiksmai */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">{tenant.name}</h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                tenant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {tenant.status === 'active' ? 'Aktyvus' :
                tenant.status === 'pending' ? 'Laukia' : 'Neaktyvus'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="truncate">{tenant.email}</span>
            <span>•</span>
            <span>{tenant.phone}</span>
            <span>•</span>
            <span>Įsikėlė: {new Date(tenant.moveInDate).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex gap-2 ml-4 flex-shrink-0">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
          >
            Redaguoti
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
          >
            Ištrinti
          </button>
        </div>
      </div>

      {/* KPI juosta - ultra kompaktiška */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.monthlyRent)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Nuoma</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.paidThisMonth)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Sumokėta</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Skola</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.deposit)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Depozitas</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-green-600 tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(refundable)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Grąžinti</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-[#2F8481] tabular-nums">
            {approvedMeters}/{tenant.meters.length}
          </div>
          <div className="text-xs text-gray-600 mt-1">Skaitliukai</div>
        </div>
      </div>

      {/* Pagrindinė informacija - 4 kolonos ultra kompaktiškai */}
      <div className="grid grid-cols-4 gap-4">
        {/* Būsto informacija */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Būstas</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Adresas:</span>
              <span className="font-medium truncate ml-2" title={tenant.property.address}>
                {tenant.property.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kambariai:</span>
              <span className="font-medium">{tenant.property.rooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plotas:</span>
              <span className="font-medium">{tenant.property.area} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aukštas:</span>
              <span className="font-medium">{tenant.property.floor}</span>
            </div>
          </div>
        </div>

        {/* Skaitliukai */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Skaitliukai</h3>
          <div className="space-y-1">
            {tenant.meters.slice(0, 3).map(meter => (
              <div key={meter.id} className="flex items-center justify-between py-0.5">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-600 truncate">{meter.kind}</div>
                  <div className="text-xs font-medium">{meter.lastReading || '—'}</div>
                </div>
                <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${meter.status === 'approved' ? 'bg-green-100 text-green-700' :
                    meter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {meter.status === 'approved' ? '✓' :
                    meter.status === 'pending' ? '⏳' : '✗'}
                </span>
              </div>
            ))}
            {tenant.meters.length > 3 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{tenant.meters.length - 3} daugiau
              </div>
            )}
          </div>
        </div>

        {/* Finansai */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Finansai</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Mėnesio:</span>
              <span className="font-medium tabular-nums">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.monthlyRent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sumokėta:</span>
              <span className="font-medium tabular-nums">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.paidThisMonth)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Skola:</span>
              <span className={`font-medium tabular-nums ${tenant.finance.totalDebt > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grąžinti:</span>
              <span className="font-medium tabular-nums text-green-600">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(refundable)}
              </span>
            </div>
          </div>
        </div>

        {/* Veiksmai ir papildoma informacija */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Veiksmai</h3>
          <div className="space-y-1">
            <button
              onClick={onInvoice}
              className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Sąskaita
            </button>
            <button
              onClick={onAddPayment}
              className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              + Mokėjimas
            </button>
            <button
              onClick={onRefund}
              className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Grąžinti
            </button>
          </div>

          {tenant.moveOut && (
            <div className="pt-2 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-1">Išsikraustymas</h4>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pranešimas:</span>
                  <span>{new Date(tenant.moveOut.notice).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Planuojama:</span>
                  <span>{new Date(tenant.moveOut.planned).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apatinė juosta - greitieji veiksmai */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Būstas: {tenant.property.address}</span>
            <span>•</span>
            <span>Skaitliukai: {approvedMeters}/{tenant.meters.length}</span>
            <span>•</span>
            <span>Skola: {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}</span>
          </div>
          <div className="flex gap-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${debtStatus === 'success' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
              {debtStatus === 'success' ? '✓ Mokėjimai tvarkoje' : '⚠ Yra skolos'}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${metersStatus === 'success' ? 'bg-green-100 text-green-700' :
                metersStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {metersStatus === 'success' ? '✓ Skaitliukai tvarkoje' :
                metersStatus === 'warning' ? '⚠ Dalinai pateikti' : '✗ Nepateikti'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====== PERFORMANCE OPTIMIZED TENANT CARD ======

// Performance optimizuotas nuomininko komponentas su React.memo
export const PerformanceTenantCard = React.memo(({
  tenant,
  onEdit,
  onDelete,
  onInvoice,
  onAddPayment,
  onRefund,
  className = ''
}: {
  tenant: {
    name: string;
    email: string;
    phone: string;
    moveInDate: string;
    status: 'active' | 'inactive' | 'pending';
    finance: {
      monthlyRent: number;
      deposit: number;
      paidThisMonth: number;
      totalDebt: number;
    };
    property: {
      address: string;
      rooms: number;
      area: number;
      floor: number;
    };
    meters: Array<{ id: string; kind: string; lastReading: string; status: 'approved' | 'pending' | 'missing' }>;
    moveOut?: {
      notice: string;
      planned: string;
    };
  };
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
  onAddPayment: () => void;
  onRefund: () => void;
  className?: string;
}) => {
  // Memoized calculations
  const refundable = React.useMemo(() =>
    Math.max(0, tenant.finance.deposit - tenant.finance.totalDebt),
    [tenant.finance.deposit, tenant.finance.totalDebt]
  );

  const approvedMeters = React.useMemo(() =>
    tenant.meters.filter(m => m.status === 'approved').length,
    [tenant.meters]
  );

  const debtStatus = React.useMemo(() =>
    tenant.finance.totalDebt > 0 ? 'error' : 'success',
    [tenant.finance.totalDebt]
  );

  const metersStatus = React.useMemo(() =>
    approvedMeters === tenant.meters.length ? 'success' :
      approvedMeters > 0 ? 'warning' : 'error',
    [approvedMeters, tenant.meters.length]
  );

  // Memoized callbacks
  const handleEdit = React.useCallback(() => onEdit(), [onEdit]);
  const handleDelete = React.useCallback(() => onDelete(), [onDelete]);
  const handleInvoice = React.useCallback(() => onInvoice(), [onInvoice]);
  const handleAddPayment = React.useCallback(() => onAddPayment(), [onAddPayment]);
  const handleRefund = React.useCallback(() => onRefund(), [onRefund]);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      {/* Viršutinė eilutė - nuomininko pagrindinė informacija + veiksmai */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-gray-900 truncate">{tenant.name}</h2>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                tenant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {tenant.status === 'active' ? 'Aktyvus' :
                tenant.status === 'pending' ? 'Laukia' : 'Neaktyvus'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="truncate">{tenant.email}</span>
            <span>•</span>
            <span>{tenant.phone}</span>
            <span>•</span>
            <span>Įsikėlė: {new Date(tenant.moveInDate).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex gap-1 ml-3 flex-shrink-0">
          <button
            onClick={handleEdit}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
          >
            Redaguoti
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
          >
            Ištrinti
          </button>
        </div>
      </div>

      {/* KPI juosta - ultra kompaktiška */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.monthlyRent)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Nuoma</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.paidThisMonth)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Sumokėta</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Skola</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-[#2F8481] tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.deposit)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Depozitas</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-green-600 tabular-nums">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(refundable)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Grąžinti</div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <div className="text-xs font-bold text-[#2F8481] tabular-nums">
            {approvedMeters}/{tenant.meters.length}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">Skaitliukai</div>
        </div>
      </div>

      {/* Pagrindinė informacija - 4 kolonos ultra kompaktiškai */}
      <div className="grid grid-cols-4 gap-3">
        {/* Būsto informacija */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Būstas</h3>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Adresas:</span>
              <span className="font-medium truncate ml-1" title={tenant.property.address}>
                {tenant.property.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kambariai:</span>
              <span className="font-medium">{tenant.property.rooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plotas:</span>
              <span className="font-medium">{tenant.property.area} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aukštas:</span>
              <span className="font-medium">{tenant.property.floor}</span>
            </div>
          </div>
        </div>

        {/* Skaitliukai */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Skaitliukai</h3>
          <div className="space-y-0.5">
            {tenant.meters.slice(0, 3).map(meter => (
              <div key={meter.id} className="flex items-center justify-between py-0.5">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-600 truncate">{meter.kind}</div>
                  <div className="text-xs font-medium">{meter.lastReading || '—'}</div>
                </div>
                <span className={`ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${meter.status === 'approved' ? 'bg-green-100 text-green-700' :
                    meter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {meter.status === 'approved' ? '✓' :
                    meter.status === 'pending' ? '⏳' : '✗'}
                </span>
              </div>
            ))}
            {tenant.meters.length > 3 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{tenant.meters.length - 3} daugiau
              </div>
            )}
          </div>
        </div>

        {/* Finansai */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Finansai</h3>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Mėnesio:</span>
              <span className="font-medium tabular-nums">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.monthlyRent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sumokėta:</span>
              <span className="font-medium tabular-nums">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.paidThisMonth)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Skola:</span>
              <span className={`font-medium tabular-nums ${tenant.finance.totalDebt > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grąžinti:</span>
              <span className="font-medium tabular-nums text-green-600">
                {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(refundable)}
              </span>
            </div>
          </div>
        </div>

        {/* Veiksmai ir papildoma informacija */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-800 border-b border-gray-200 pb-1">Veiksmai</h3>
          <div className="space-y-1">
            <button
              onClick={handleInvoice}
              className="w-full px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Sąskaita
            </button>
            <button
              onClick={handleAddPayment}
              className="w-full px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              + Mokėjimas
            </button>
            <button
              onClick={handleRefund}
              className="w-full px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
            >
              Grąžinti
            </button>
          </div>

          {tenant.moveOut && (
            <div className="pt-1 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-1">Išsikraustymas</h4>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pranešimas:</span>
                  <span>{new Date(tenant.moveOut.notice).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Planuojama:</span>
                  <span>{new Date(tenant.moveOut.planned).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apatinė juosta - greitieji veiksmai */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>Būstas: {tenant.property.address}</span>
            <span>•</span>
            <span>Skaitliukai: {approvedMeters}/{tenant.meters.length}</span>
            <span>•</span>
            <span>Skola: {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(tenant.finance.totalDebt)}</span>
          </div>
          <div className="flex gap-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${debtStatus === 'success' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
              {debtStatus === 'success' ? '✓ Mokėjimai tvarkoje' : '⚠ Yra skolos'}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${metersStatus === 'success' ? 'bg-green-100 text-green-700' :
                metersStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {metersStatus === 'success' ? '✓ Skaitliukai tvarkoje' :
                metersStatus === 'warning' ? '⚠ Dalinai pateikti' : '✗ Nepateikti'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

PerformanceTenantCard.displayName = 'PerformanceTenantCard';
