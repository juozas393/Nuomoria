type Props = {
  refundAmount: number;
  canRefund: boolean;
  refundDeadline?: string | null;
  onSeeFormula: () => void;
  onRefund: () => void;
};

export function DepositSummary({ refundAmount, canRefund, refundDeadline, onSeeFormula, onRefund }: Props) {
  const fx = (n: number) => {
    const EPS = 0.005;
    const v = Math.abs(n) < EPS ? 0 : Math.round(n * 100) / 100;
    return v.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-neutral-500">Depozito santrauka</div>

      <div className="text-[15px] font-semibold text-teal-700">
        Grąžintina: {fx(refundAmount)} €
      </div>

      {refundDeadline && (
        <div className="text-xs text-neutral-500">
          Grąžinti iki {(() => { const d = new Date(refundDeadline); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
        </div>
      )}

      <button
        className="text-[12px] text-teal-700 underline"
        onClick={onSeeFormula}
      >
        Peržiūrėti formulę
      </button>

      {canRefund && (
        <Button
          variant="primary"
          className="w-full h-10"
          onClick={onRefund}
        >
          Grąžinti {fx(refundAmount)} €
        </Button>
      )}
    </div>
  );
}

const Button = ({ variant = "primary", className, ...p }: any) => (
  <button
    className={`rounded-xl text-sm font-medium transition ${variant === "primary" ? "bg-[#2F8481] text-white hover:bg-[#297674]" :
        variant === "outline" ? "border border-neutral-300 hover:bg-neutral-50" :
          "hover:bg-neutral-100"
      } ${className || ''}`}
    {...p}
  />
);
