import React from 'react';

export type SmartActionCategory = 'payment' | 'maintenance' | 'document' | 'communication';

export interface SmartActionItem {
  id: string;
  title: string;
  description?: string;
  category: SmartActionCategory;
  isCompleted?: boolean;
}

export interface SmartActionsPanelProps {
  actions: SmartActionItem[];
  onAction: (action: SmartActionItem) => void | Promise<void>;
}

const categoryLabel: Record<SmartActionCategory, string> = {
  payment: 'Mokėjimai',
  maintenance: 'Priežiūra',
  document: 'Dokumentai',
  communication: 'Komunikacija'
};

export const SmartActionsPanel: React.FC<SmartActionsPanelProps> = ({ actions, onAction }) => {
  if (actions.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
        Šiuo metu papildomų veiksmų nereikia.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Siūlomi veiksmai</h2>
          <p className="text-sm text-black/60">Greiti žingsniai kasdienėms užduotims.</p>
        </div>
      </header>

      <ul className="mt-4 space-y-3">
        {actions.map((action) => (
          <li key={action.id} className="rounded-xl border border-black/10 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-black">{action.title}</p>
                {action.description && <p className="text-xs text-black/60">{action.description}</p>}
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  {categoryLabel[action.category]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAction(action)}
                disabled={action.isCompleted}
                className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium text-black transition hover:bg-black/5 disabled:opacity-50"
              >
                {action.isCompleted ? 'Užbaigta' : 'Atlikti'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SmartActionsPanel;

















