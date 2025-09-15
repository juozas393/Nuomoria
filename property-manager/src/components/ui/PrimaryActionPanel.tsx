import { formatCurrency } from '../../utils/format';

type Props = {
  context: {
    canRefund: boolean;
    refundAmount?: number;
    hasOutstandingDebt: boolean;
    hasConfirmedCharges: boolean;
    needsMeterApproval: boolean;
    isMoveOutSoon: boolean;
    totalDebt: number;
  };
  onPrimary: (action: string) => void;
};

export function PrimaryActionPanel({ context, onPrimary }: Props) {
  const getPrimaryAction = () => {
    // Priority 1: Refund deposit if all conditions met
    if (context.canRefund) {
      return {
        label: `Grąžinti ${context.refundAmount ? formatCurrency(context.refundAmount) : 'depozitą'}`,
        variant: "primary" as const,
        action: "refund_deposit",
        disabled: false,
        reason: null
      };
    }
    
    // Priority 2: Generate invoice if unpaid
    if (context.hasOutstandingDebt || context.hasConfirmedCharges) {
      return {
        label: "Išrašyti sąskaitą",
        variant: "primary" as const,
        action: "generate_invoice",
        disabled: false,
        reason: null
      };
    }
    
    // Priority 3: Prepare move out if within 7 days
    if (context.isMoveOutSoon) {
      return {
        label: "Paruošti išsikraustymą",
        variant: "primary" as const,
        action: "prepare_moveout",
        disabled: false,
        reason: null
      };
    }
    
    // Priority 4: Approve meters if pending
    if (context.needsMeterApproval) {
      return {
        label: "Patvirtinti skaitliukus",
        variant: "primary" as const,
        action: "approve_meters",
        disabled: false,
        reason: null
      };
    }
    
    // Default: Notify tenant
    return {
      label: "Pranešti nuomininkui",
      variant: "outline" as const,
      action: "notify_tenant",
      disabled: false,
      reason: null
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-3">
      <Button 
        variant={primaryAction.variant}
        className={`w-full h-10 ${primaryAction.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !primaryAction.disabled && onPrimary(primaryAction.action)}
        disabled={primaryAction.disabled}
      >
        {primaryAction.label}
      </Button>
      
      {primaryAction.reason && (
        <div className="text-xs text-neutral-500 bg-neutral-50 p-2 rounded-lg">
          {primaryAction.reason}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="text-xs h-8">+ Mokėjimas</Button>
        <Button variant="outline" className="text-xs h-8">Išrašyti</Button>
        <Button variant="outline" className="text-xs h-8">Pažymėti išsikraustė</Button>
        <Button variant="outline" className="text-xs h-8">Pranešti</Button>
      </div>
    </div>
  );
}

const Button = ({variant="primary", className, ...p}: any) => (
  <button
    className={`rounded-xl text-sm font-medium transition ${
      variant==="primary" ? "bg-[#2F8481] text-white hover:bg-[#297674]" :
      variant==="outline" ? "border border-neutral-300 hover:bg-neutral-50" :
      "hover:bg-neutral-100"
    } ${className || ''}`}
    {...p}
  />
);
