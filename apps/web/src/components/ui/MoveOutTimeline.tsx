type Props = {
  notice?: string;
  planned?: string;
  actual?: string;
  refundDeadline?: string | null;
};

export function MoveOutTimeline({ notice, planned, actual, refundDeadline }: Props) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <Card>
      <h3 className="text-[13px] font-semibold mb-3">Išsikraustymas</h3>

      <ol className="space-y-2 text-[13px]">
        <li className="flex items-center justify-between">
          <span className="text-neutral-500">Pranešė</span>
          <span>{formatDate(notice)}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-neutral-500">Planuojama</span>
          <span>{formatDate(planned)}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-neutral-500">Faktinė</span>
          <span className={actual ? "" : "text-neutral-400"}>{formatDate(actual)}</span>
        </li>
      </ol>

      {refundDeadline && (
        <div className="mt-3 text-xs text-neutral-500">
          Grąžinimo terminas: {refundDeadline}
        </div>
      )}
    </Card>
  );
}

const Card = ({ className, ...p }: React.HTMLProps<HTMLDivElement>) =>
  <section className={["rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", className].join(' ')} {...p} />;
