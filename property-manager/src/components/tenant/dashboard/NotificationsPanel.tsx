import React from 'react';

export type NotificationTone = 'info' | 'warning' | 'success' | 'neutral';

export interface DashboardNotification {
  id: string;
  title: string;
  body: string;
  tone: NotificationTone;
  timestamp: string;
  isRead: boolean;
  data?: Record<string, unknown> | null;
}

export interface NotificationsPanelProps {
  notifications: DashboardNotification[];
}

const toneClass: Record<NotificationTone, string> = {
  info: 'border-[#2F8481]/30 bg-[#2F8481]/5',
  success: 'border-black/10 bg-white',
  warning: 'border-black/10 bg-black/5',
  neutral: 'border-black/10 bg-white'
};

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications }) => {
  if (notifications.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
        Naujausių pranešimų nėra.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-black">Pranešimai</h2>
        <p className="text-sm text-black/60">Paskutiniai įrašai iš nuomos sistemos.</p>
      </header>

      <ul className="space-y-3">
        {notifications.map((item) => (
          <li
            key={item.id}
            className={`rounded-xl border px-4 py-3 text-sm text-black/70 ${toneClass[item.tone ?? 'neutral']}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-black">{item.title}</p>
                <p className="text-sm text-black/60">{item.body}</p>
              </div>
              <span className="text-xs text-black/50 whitespace-nowrap">{item.timestamp}</span>
            </div>
            {!item.isRead && <p className="mt-2 text-xs font-medium text-[#2F8481]">Neskaitytas</p>}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default NotificationsPanel;

















