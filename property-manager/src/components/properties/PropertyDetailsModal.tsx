/* eslint-disable react/prop-types */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PhoneIcon, EnvelopeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { ModalPortal } from '../ui/ModalPortal';
import clsx from 'clsx';
import { ApartmentMeterManager } from './ApartmentMeterManager';

// Types
interface MeterReading {
  id: string;
  date: string;
  electricity: number;
  water: number;
  heating: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'tenant' | 'landlord';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'tenant' | 'landlord';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
}

interface ChatUser {
  id: string;
  name: string;
  type: 'tenant' | 'landlord';
  isOnline: boolean;
}

interface Apartment {
  id: string;
  address_id?: string;
  apartmentNumber: string;
  area: number;
  rooms: number;
  monthlyRent: number;
  utilitiesThisMonth?: number;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    contractStart: string;
    contractEnd: string;
    tenant_response_date?: string;
    planned_move_out_date?: string;
    deposit: number;
    outstanding_amount: number;
    notification_count: number;
    monthlyRent: number;
    last_payment_date?: string;
    meters_submitted?: boolean;
    cleaning_cost?: number;
    cleaning?: number;
    other?: number;
    actual_move_out_date?: string;
  };
  photos?: string[];
}

interface PropertyDetailsModalProps {
  apartment: Apartment;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (apartment: Apartment) => void;
  onDelete: (id: string) => void;
}

// Utility functions (moved to top for component access)
const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('lt-LT');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Optimized Components
const TenantHeader = React.memo(({ apartment, calculations, contractStatus, onCall, onMessage, onRemind, onHistory }: {
  apartment: Apartment;
  calculations: any;
  contractStatus: any;
  onCall: () => void;
  onMessage: () => void;
  onRemind: () => void;
  onHistory: () => void;
}) => (
  <header className="flex items-center justify-between gap-4 p-4 border-b bg-white">
    <div className="min-w-0 flex-1">
      <h2 className="font-semibold truncate text-base">
        {apartment.tenant?.name || 'Nėra nuomininko'} • #{apartment.apartmentNumber} • {apartment.area > 0 ? `${apartment.area} m²` : '—'} • {apartment.rooms > 0 ? `${apartment.rooms}k` : '—'}
      </h2>
    </div>
    
    <div className="hidden lg:flex items-center gap-3 [font-variant-numeric:tabular-nums] flex-shrink-0">
      {calculations.totalDebt > 0 ? (
        <span className="chip chip-danger text-sm">Skola {formatCurrency(calculations.totalDebt)}</span>
      ) : (
        <span className="chip chip-ok text-sm">Nėra skolos</span>
      )}
      <span className="chip chip-neutral text-sm">
        Šio mėn.: Nuoma {formatCurrency(calculations.monthlyRent)} + Mokesčiai {formatCurrency(calculations.utilitiesThisMonth)} = {formatCurrency(calculations.currentDue)}
      </span>
      <span className="chip chip-neutral text-sm">Dep. {formatCurrency(calculations.deposit)}</span>
      <span className={clsx("chip text-sm", 
        contractStatus.text === 'Aktyvi' ? 'chip-ok' :
        contractStatus.text === 'Sutartis baigėsi' ? 'chip-danger' :
        'chip-warn'
      )}>{contractStatus.text}</span>
    </div>
    
    <div className="flex items-center gap-2 flex-shrink-0">
      <button className="icon-btn text-sm" title="Skambinti" onClick={onCall}>
        <PhoneIcon className="w-4 h-4" />
      </button>
      <button className="icon-btn text-sm" title="Žinutė" onClick={onMessage}>
        <EnvelopeIcon className="w-4 h-4" />
      </button>
      <button className="btn-ghost text-sm px-3 py-1.5" title="Priminti" onClick={onRemind}>
        Priminti
      </button>
      <button className="icon-btn text-sm" title="Veiksmų istorija" onClick={onHistory}>
        <DocumentTextIcon className="w-4 h-4" />
      </button>
    </div>
  </header>
));

TenantHeader.displayName = 'TenantHeader';

const FinanceSection = React.memo(({ calculations, onPaymentHistory }: {
  calculations: any;
  onPaymentHistory: () => void;
}) => (
  <section className="rounded-lg border bg-white h-[140px]">
    <div className="px-4 py-3 border-b text-base font-medium">Finansai</div>
    <div className="p-4 space-y-3 text-sm [font-variant-numeric:tabular-nums]">
      <Row 
        label="Skola (viso)" 
        value={formatCurrency(calculations.totalDebt)} 
        valueClass={calculations.totalDebt > 0 ? "text-rose-600 text-lg font-semibold" : ""} 
      />
      
      <Row
        label="Šio mėn. mokėtina"
        value={formatCurrency(calculations.currentDue)}
        sub={`Nuoma ${formatCurrency(calculations.monthlyRent)} + Mokesčiai ${formatCurrency(calculations.utilitiesThisMonth)}`}
      />
      
      <Row label="Sumokėta šį mėn." value={formatCurrency(calculations.paidThisMonth)} />
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full bg-[#2F8481] transform-gpu transition-all duration-300" style={{ width: `${calculations.payPct}%` }} />
      </div>
      <div className="text-sm text-neutral-500">
        Sumokėta / Šio mėn. mokėtina ({formatCurrency(calculations.currentDue)})
      </div>
      {calculations.currentDue > calculations.paidThisMonth && (
        <Row 
          label="Likutis šį mėn." 
          value={formatCurrency(calculations.currentDue - calculations.paidThisMonth)}
          valueClass="text-rose-600"
        />
      )}
      
      <div className="flex gap-3 pt-3">
        <button className="btn-ghost text-sm px-4 py-2" onClick={onPaymentHistory}>
          Mokėjimų istorija
        </button>
      </div>
    </div>
  </section>
));

FinanceSection.displayName = 'FinanceSection';

const MetersSection = React.memo(({ calculations, getMeterStatus }: {
  calculations: any;
  getMeterStatus: (type: string) => any;
}) => (
  <section className="rounded-lg border bg-white h-[180px]">
    <div className="px-4 py-3 border-b text-base font-medium">
      Mokesčiai iš skaitliukų: {formatCurrency(calculations.utilitiesThisMonth)}
    </div>
    <div className="p-4 space-y-3 text-sm">
      <div className="space-y-3">
        {Object.entries(calculations.meterReadings).map(([type, meter]: [string, any]) => {
          const status = getMeterStatus(type);
          const difference = meter.current - meter.previous;
          const cost = difference * meter.rate;
          
          return (
            <div key={type} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-neutral-600 capitalize text-sm font-medium min-w-[70px]">{type}:</span>
                <span className="text-sm text-neutral-500">
                  {meter.previous}→{meter.current} ({difference > 0 ? '+' : ''}{difference}{meter.unit})
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm [font-variant-numeric:tabular-nums] font-medium">
                  {formatCurrency(cost)}
                </span>
                <span className={status.status === 'pateikta' ? 'text-green-600' : status.status === 'veluoja' ? 'text-red-600' : 'text-orange-600'}>
                  {status.icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-3 pt-3">
        <button className="btn-ghost text-sm px-4 py-2" onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Pateikti');
          }
        }}>
          Pateikti
        </button>
        <button className="btn-ghost text-sm px-4 py-2" onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Redaguoti');
          }
        }}>
          Redaguoti
        </button>
      </div>
    </div>
  </section>
));

MetersSection.displayName = 'MetersSection';

const ContractDatesSection = React.memo(({ apartment, getDaysUntilContractEnd }: {
  apartment: Apartment;
  getDaysUntilContractEnd: (contractEnd: string) => number | string;
}) => (
  <section className="rounded-lg border bg-white h-[120px]">
    <div className="px-4 py-3 border-b text-base font-medium">Sutarties datos</div>
    <div className="p-4 grid grid-cols-3 gap-4 text-sm">
      <KV k="Pradžia" v={formatDate(apartment.tenant?.contractStart || '')} />
      <KV k="Pabaiga" v={formatDate(apartment.tenant?.contractEnd || '')} />
      <KV k="Liko dienų" v={(() => {
        const daysLeft = getDaysUntilContractEnd(apartment.tenant?.contractEnd || '');
        if (typeof daysLeft === 'string') {
          return daysLeft;
        } else if (daysLeft < 0) {
          return 'Baigėsi';
        } else if (daysLeft === 0) {
          return 'Baigiasi šiandien';
        } else {
          return `${daysLeft} dienų`;
        }
      })()} />
    </div>
  </section>
));

ContractDatesSection.displayName = 'ContractDatesSection';

const MoveOutSection = React.memo(({ apartment, actualMoveOutDate, setActualMoveOutDate, calculations, onSaveActualMoveOutDate }: {
  apartment: Apartment;
  actualMoveOutDate: string;
  setActualMoveOutDate: (date: string) => void;
  calculations: any;
  onSaveActualMoveOutDate: () => void;
}) => (
  <section className="rounded-lg border bg-white h-[200px]">
    <div className="px-4 py-3 border-b text-base font-medium">Išsikraustymas</div>
    <div className="p-4 space-y-3 text-sm">
      <Row 
        label="Pranešimas gautas" 
        value={apartment.tenant?.tenant_response_date ? formatDate(apartment.tenant.tenant_response_date) : '—'} 
      />
      <Row 
        label="Planuojama data" 
        value={apartment.tenant?.planned_move_out_date ? formatDate(apartment.tenant.planned_move_out_date) : '—'} 
      />
      
      <div className="flex items-center justify-between">
        <span className="text-neutral-600">Faktinė data:</span>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="text-sm border border-neutral-300 rounded px-3 py-2 w-32"
            value={actualMoveOutDate}
            onChange={(e) => setActualMoveOutDate(e.target.value)}
            placeholder="yyyy-MM-dd"
          />
          <button 
            className={`text-sm px-4 py-2 rounded ${
              actualMoveOutDate 
                ? 'bg-[#2F8481] text-white hover:bg-[#2F8481]/90' 
                : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            }`}
            onClick={onSaveActualMoveOutDate}
            disabled={!actualMoveOutDate}
          >
            Pažymėti išsikraustė
          </button>
        </div>
      </div>
      
      {(() => {
        const plannedDate = apartment.tenant?.planned_move_out_date;
        const actualDate = actualMoveOutDate || apartment.tenant?.actual_move_out_date;
        const today = new Date();
        
        if (!plannedDate) return null;
        
        const planned = new Date(plannedDate);
        const actual = actualDate ? new Date(actualDate) : null;
        const endDate = actual || today;
        const lateDays = Math.max(0, Math.ceil((endDate.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)));
        
        let statusText = '';
        let statusClass = '';
        
        if (actual) {
          statusText = `Išsikraustyta ${formatDate(actualDate || '')}`;
          statusClass = 'text-green-600';
        } else if (lateDays > 0) {
          statusText = `Vėluoja ${lateDays} d.`;
          statusClass = 'text-orange-600';
        } else {
          statusText = `Išsikraustys po ${Math.abs(lateDays)} d.`;
          statusClass = 'text-neutral-600';
        }
        
        return (
          <>
            <Row label="Statusas" value={statusText} valueClass={statusClass} />
            {calculations.lateFee > 0 && (
              <Row 
                label="Vėlavimo mokestis" 
                value={`${calculations.lateDays} d. × 25 €/d = ${formatCurrency(calculations.lateFee)}`}
                valueClass="text-orange-600"
              />
            )}
            <div className="flex gap-3 pt-3">
              {calculations.lateFee > 0 && (
                <button className="btn-ghost text-sm px-4 py-2" onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Taikyti vėlavimo mokestį');
                  }
                }}>
                  Taikyti vėlavimo mokestį
                </button>
              )}
            </div>
          </>
        );
      })()}
    </div>
  </section>
));

MoveOutSection.displayName = 'MoveOutSection';

const DepositSection = React.memo(({ calculations, onAddExpense }: {
  calculations: any;
  onAddExpense: () => void;
}) => (
  <section className="rounded-lg border bg-white h-[200px]">
    <div className="px-4 py-3 border-b text-base font-medium">Depozito grąžinimas</div>
    <div className="p-4 space-y-3 text-sm [font-variant-numeric:tabular-nums]">
      <Row label="Depozitas" value={formatCurrency(calculations.deposit)} />
      
      <div className="flex items-center justify-between">
        <span className="text-neutral-600">Leisti dengti skolas depozitu?</span>
        <div className="flex items-center gap-3">
          <button className={`text-sm px-3 py-1.5 rounded ${calculations.allowDepositForDebt ? 'bg-[#2F8481] text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            Taip
          </button>
          <button className={`text-sm px-3 py-1.5 rounded ${!calculations.allowDepositForDebt ? 'bg-[#2F8481] text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            Ne
          </button>
        </div>
      </div>
      
      {calculations.cleaning > 0 && (
        <Row label="Patvirtintos išlaidos" value={`– ${formatCurrency(calculations.cleaning)}`} />
      )}
      <button className="btn-ghost text-sm px-4 py-2" onClick={onAddExpense}>
        +Pridėti išlaidą
      </button>
      
      {!calculations.allowDepositForDebt && calculations.totalDebt > 0 ? (
        <div className="pt-3 border-t mt-3">
          <p className="text-sm text-orange-600">
            ⚠️ Grąžinimas negalimas, kol yra skola
          </p>
        </div>
      ) : calculations.allowDepositForDebt && calculations.extraPayable > 0 ? (
        <div className="flex items-center gap-3 pt-3 border-t mt-3">
          <span className="chip chip-danger text-sm">Papildomai mokėtina</span>
          <span className="text-lg font-semibold text-rose-600">{formatCurrency(calculations.extraPayable)}</span>
        </div>
      ) : calculations.refundable > 0 ? (
        <div className="flex items-baseline justify-between pt-3 border-t mt-3">
          <span className="font-semibold text-base">Grąžintina</span>
          <span className="text-lg font-semibold text-[#2F8481]">{formatCurrency(calculations.refundable)}</span>
        </div>
      ) : null}
      
      {calculations.allowDepositForDebt && (
        <p className="text-sm text-neutral-500">
          Formulė: {formatCurrency(calculations.deposit)} &minus; {formatCurrency(calculations.totalDebt)} &minus; {formatCurrency(calculations.cleaning + calculations.other)} = {formatCurrency(calculations.refundable - calculations.extraPayable)}
        </p>
      )}
      
      {(!calculations.allowDepositForDebt && calculations.totalDebt > 0) || calculations.refundable === 0 ? (
        <div className="pt-3 border-t mt-3">
          <div className="text-sm text-neutral-600 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⛔</span>
              <span>Yra neapmokėta skola (politika &quot;Ne&quot;)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⛔</span>
              <span>Nepatvirtinti skaitliukai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⛔</span>
              <span>Neapspręstas vėlavimo mokestis</span>
            </div>
          </div>
        </div>
      ) : null}
      
      <div className="flex gap-3 pt-3">
        {!calculations.allowDepositForDebt && calculations.totalDebt > 0 ? (
          <button className="btn-ghost text-sm px-5 py-2.5 flex-1 opacity-50 cursor-not-allowed" disabled>
            Grąžinti negalima (yra skola)
          </button>
        ) : calculations.allowDepositForDebt && calculations.extraPayable > 0 ? (
          <button className="btn-brand text-sm px-5 py-2.5 flex-1" onClick={() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Išrašyti sąskaitą');
            }
          }}>
            Išrašyti sąskaitą
          </button>
        ) : calculations.refundable > 0 ? (
          <button className="btn-brand text-sm px-5 py-2.5 flex-1" onClick={() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Grąžinti');
            }
          }}>
            Grąžinti {formatCurrency(calculations.refundable)}
          </button>
        ) : (
          <button className="btn-ghost text-sm px-5 py-2.5 flex-1 opacity-50 cursor-not-allowed" disabled>
            Grąžinti negalima
          </button>
        )}
      </div>
    </div>
  </section>
));

DepositSection.displayName = 'DepositSection';

const ActionBar = React.memo(({ calculations, onPaymentHistory, onMarkMovedOut }: {
  calculations: any;
  onPaymentHistory: () => void;
  onMarkMovedOut: () => void;
}) => (
  <div className="flex items-center justify-between gap-4 p-4 border-t bg-white">
    <div className="flex items-center gap-3">
      <button className="btn-ghost text-sm px-4 py-2" onClick={onPaymentHistory}>
        Mokėjimų istorija
      </button>
    </div>
    <div className="flex items-center gap-3">
      {calculations.refundable > 0 ? (
        <button className="btn-brand text-sm px-5 py-2.5" onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Grąžinti');
          }
        }}>
          Grąžinti {formatCurrency(calculations.refundable)}
        </button>
      ) : (
        <button className="btn-brand text-sm px-5 py-2.5" onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Išrašyti sąskaitą');
          }
        }}>
          Išrašyti sąskaitą
        </button>
      )}
      <button className="btn-ghost text-sm px-4 py-2" onClick={onMarkMovedOut}>
        Pažymėti išsikraustė
      </button>
    </div>
  </div>
));

ActionBar.displayName = 'ActionBar';

// Main Component
// eslint-disable-next-line react/prop-types
const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = React.memo(({
  apartment,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [compact, setCompact] = useState(false);
  const [showCollapsible, setShowCollapsible] = useState(false);
  const [actualMoveOutDate, setActualMoveOutDate] = useState<string>(apartment.tenant?.actual_move_out_date || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'meters'>('overview');
  const unlockRef = useRef<null | (() => void)>(null);
  
  const [currentUser, setCurrentUser] = useState<ChatUser>({
    id: 'landlord-1',
    name: 'Nuomotojas',
    type: 'landlord',
    isOnline: true
  });

  // Compact mode detection
  useEffect(() => {
    const checkCompact = () => {
      setCompact(window.innerHeight < 900);
    };
    
    checkCompact();
    window.addEventListener('resize', checkCompact);
    return () => window.removeEventListener('resize', checkCompact);
  }, []);

  // Scroll lock functionality
  const lockScroll = useCallback(() => {
    const y = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    return () => {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, Math.abs(parseInt(top || '0', 10)));
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      unlockRef.current = lockScroll();
    }
    return () => {
      unlockRef.current?.();
    };
  }, [isOpen, lockScroll]);

  // Event handlers
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCall = useCallback(() => {
    if (apartment.tenant?.phone) {
      window.open(`tel:${apartment.tenant.phone}`, '_blank');
    }
  }, [apartment.tenant?.phone]);

  const handleMessage = useCallback(() => {
    if (apartment.tenant?.email) {
      window.open(`mailto:${apartment.tenant.email}`, '_blank');
    }
  }, [apartment.tenant?.email]);

  const handleRemind = useCallback(() => {
    // Security: Don't log sensitive tenant information
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending reminder to:', apartment.tenant?.name);
    }
  }, [apartment.tenant?.name]);

  const handleHistory = useCallback(() => {
    // Security: Don't log sensitive tenant information
    if (process.env.NODE_ENV === 'development') {
      console.log('Opening history for:', apartment.tenant?.name);
    }
  }, [apartment.tenant?.name]);

  const handlePaymentHistory = useCallback(() => {
    // Security: Don't log sensitive tenant information
    if (process.env.NODE_ENV === 'development') {
      console.log('Opening payment history for:', apartment.tenant?.name);
    }
  }, [apartment.tenant?.name]);

  const handleAddExpense = useCallback(() => {
    // Security: Don't log sensitive tenant information
    if (process.env.NODE_ENV === 'development') {
      console.log('Adding expense for:', apartment.tenant?.name);
    }
  }, [apartment.tenant?.name]);

  const handleMarkMovedOut = useCallback(() => {
    // Security: Don't log sensitive tenant information
    if (process.env.NODE_ENV === 'development') {
      console.log('Marking moved out for:', apartment.tenant?.name);
    }
  }, [apartment.tenant?.name]);

  const handleSaveActualMoveOutDate = useCallback(() => {
    // Security: Don't log sensitive move-out information
    if (process.env.NODE_ENV === 'development') {
      console.log('Saving actual move-out date:', actualMoveOutDate);
    }
  }, [actualMoveOutDate]);

  // Keyboard event handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);



  const getDaysUntilContractEnd = (contractEnd: string) => {
    if (!contractEnd) return 'Nenurodyta';
    
    const endDate = new Date(contractEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getContractStatus = () => {
    if (!apartment.tenant?.contractEnd) {
      return { text: 'Nenurodyta', color: 'text-gray-500' };
    }
    
    const daysLeft = getDaysUntilContractEnd(apartment.tenant.contractEnd);
    if (typeof daysLeft === 'string') {
      return { text: daysLeft, color: 'text-gray-500' };
    }
    
    if (daysLeft < 0) {
      return { text: 'Sutartis baigėsi', color: 'text-red-600' };
    } else if (daysLeft === 0) {
      return { text: 'Baigiasi šiandien', color: 'text-orange-600' };
    } else if (daysLeft <= 30) {
      return { text: `Liko ${daysLeft} d.`, color: 'text-orange-600' };
    } else {
      return { text: 'Aktyvi', color: 'text-green-600' };
    }
  };

  const calculateDepositReturnForModal = () => {
    const EPS = 0.01;
    const round = (x: number) => Math.abs(x) < EPS ? 0 : Math.round(x * 100) / 100;
    
    const deposit = apartment.tenant?.deposit || 0;
    const outstanding = apartment.tenant?.outstanding_amount || 0;
    const cleaning = apartment.tenant?.cleaning || 0;
    const other = apartment.tenant?.other || 0;
    const utilities = apartment.utilitiesThisMonth || 0;
    
    // Calculate late fee
    const plannedDate = apartment.tenant?.planned_move_out_date;
    const actualDate = actualMoveOutDate || apartment.tenant?.actual_move_out_date;
    const today = new Date();
    
    let lateDays = 0;
    let lateFee = 0;
    
    if (plannedDate) {
      const planned = new Date(plannedDate);
      const endDate = actualDate ? new Date(actualDate) : today;
      lateDays = Math.max(0, Math.ceil((endDate.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)));
      lateFee = lateDays * 25; // 25€ per day
    }
    
    const totalDebt = outstanding + utilities + lateFee;
    const totalExpenses = cleaning + other;
    const refundable = round(deposit - totalDebt - totalExpenses);
    const extraPayable = round(totalDebt + totalExpenses - deposit);
    
    return {
      deposit,
      totalDebt,
      utilitiesThisMonth: utilities,
      cleaning,
      other,
      lateDays,
      lateFee,
      refundable: Math.max(0, refundable),
      extraPayable: Math.max(0, extraPayable),
      allowDepositForDebt: false, // Default policy
      currentDue: apartment.monthlyRent + utilities,
      paidThisMonth: 0, // This would come from actual payment data
      payPct: 0, // This would be calculated from actual payments
      monthlyRent: apartment.monthlyRent,
      meterReadings: {
        electricity: { previous: 200, current: 1325, rate: 0.12, unit: 'kWh' },
        water: { previous: 45, current: 49, rate: 2.5, unit: 'm³' },
        heating: { previous: 0, current: 0, rate: 0.08, unit: 'GJ' },
        gas: { previous: 0, current: 0, rate: 0.8, unit: 'm³' }
      }
    };
  };

  const getMeterStatus = (type: string) => {
    const statuses = {
      electricity: { status: 'pateikta', icon: '✓' },
      water: { status: 'pateikta', icon: '✓' },
      heating: { status: 'laukia', icon: '⏳' },
      gas: { status: 'laukia', icon: '⏳' }
    };
    return statuses[type as keyof typeof statuses] || { status: 'unknown', icon: '?' };
  };

  // Memoized calculations
  const calculations = useMemo(() => calculateDepositReturnForModal(), [apartment, actualMoveOutDate]);
  const contractStatus = useMemo(() => getContractStatus(), [apartment.tenant?.contractEnd]);
  
  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-[1000px] h-[720px] rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden">
        
        <TenantHeader
          apartment={apartment}
          calculations={calculations}
          contractStatus={contractStatus}
          onCall={handleCall}
          onMessage={handleMessage}
          onRemind={handleRemind}
          onHistory={handleHistory}
        />

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Apžvalga
            </button>
            <button
              onClick={() => setActiveTab('meters')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meters'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Skaitliukai
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-4 p-4 h-[calc(720px-180px)]">
            
            {/* Left Column: 7/12 */}
            <section className="col-span-7 space-y-4">
              <div className="flex justify-start">
                <button className="btn-brand text-sm px-5 py-2.5" onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('+ Mokėjimas');
                  }
                }}>
                  + Mokėjimas
                </button>
              </div>
              
              <FinanceSection
                calculations={calculations}
                onPaymentHistory={handlePaymentHistory}
              />
              
              <MetersSection
                calculations={calculations}
                getMeterStatus={getMeterStatus}
              />
              
              <ContractDatesSection
                apartment={apartment}
                getDaysUntilContractEnd={getDaysUntilContractEnd}
              />
            </section>

            {/* Right Column: 5/12 */}
            <section className="col-span-5 space-y-4">
              <MoveOutSection
                apartment={apartment}
                actualMoveOutDate={actualMoveOutDate}
                setActualMoveOutDate={setActualMoveOutDate}
                calculations={calculations}
                onSaveActualMoveOutDate={handleSaveActualMoveOutDate}
              />
              
              <DepositSection
                calculations={calculations}
                onAddExpense={handleAddExpense}
              />
            </section>
          </div>
        )}

        {activeTab === 'meters' && (
          <div className="p-6 h-[calc(720px-180px)] overflow-y-auto">
            <ApartmentMeterManager
              propertyId={apartment.id}
              addressId={apartment.address_id || 'demo-address-id'}
              onMetersUpdate={() => {
                // Security: Don't log sensitive meter information
                if (process.env.NODE_ENV === 'development') {
                  console.log('Meters updated');
                }
                // Refresh data if needed
              }}
            />
          </div>
        )}

        <ActionBar
          calculations={calculations}
          onPaymentHistory={handlePaymentHistory}
          onMarkMovedOut={handleMarkMovedOut}
        />
      </div>
    </ModalPortal>
  );
});

PropertyDetailsModal.displayName = 'PropertyDetailsModal';

// Helper components
function Row({label, value, sub, valueClass=""}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-neutral-600">{label}</span>
        <strong className={clsx("text-[13px] md:text-sm", valueClass)}>{value}</strong>
      </div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

function Line({icon, text}: {icon: string; text: string}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-500">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function KV({k, v}: {k: string; v: string}) {
  return (
    <div className="text-center">
      <div className="text-xs text-neutral-600">{k}</div>
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}

export { PropertyDetailsModal }; 