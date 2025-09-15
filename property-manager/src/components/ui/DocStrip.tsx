type Doc = {
  icon: string;
  label: string;
  onView: () => void;
  onDownload?: () => void;
};

type Props = {
  docs: Doc[];
};

export function DocStrip({ docs }: Props) {
  return (
    <div className="px-5 py-2 bg-neutral-50 border-b">
      <div className="flex flex-wrap gap-2">
        {docs.map(doc => (
          <span key={doc.label} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] shadow-sm">
            <span className="text-neutral-500">
              {doc.icon === 'file-text' ? '📄' : 
               doc.icon === 'handshake' ? '🤝' : 
               doc.icon === 'receipt' ? '🧾' : '📋'}
            </span>
            <button 
              onClick={doc.onView} 
              className="font-medium text-neutral-800 hover:text-[#2F8481] hover:underline"
            >
              {doc.label}
            </button>
            {doc.onDownload && (
              <button 
                onClick={doc.onDownload} 
                className="text-neutral-500 hover:text-[#2F8481] hover:underline"
              >
                Atsisiųsti
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
