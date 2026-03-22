/**
 * Centralized date formatting for Nuomoria.
 * Guarantees YYYY-MM-DD (Lithuanian standard) regardless of browser locale.
 */

/** Format date as YYYY-MM-DD (e.g. 2026-03-15) */
export function fmtDate(d: string | Date | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Format date + time as YYYY-MM-DD HH:MM (e.g. 2026-03-15 14:30) */
export function fmtDateTime(d: string | Date | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Format relative time with YYYY-MM-DD fallback for older dates */
export function fmtRelative(d: string | Date | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Ką tik';
    if (diffMin < 60) return `prieš ${diffMin} min.`;
    if (diffH < 24) return `prieš ${diffH} val.`;
    if (diffDays === 1) return 'vakar';
    if (diffDays < 7) return `prieš ${diffDays} d.`;
    return fmtDate(date);
}
