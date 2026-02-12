// src/lib/utils/date.ts
/**
 * Date helpers (no external deps)
 */

export function toISODate(d: Date): string {
    // YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function formatDateLong(d: Date, locale: string = "en-PH"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "2-digit",
    }).format(d);
}

export function formatDateTime(d: Date, locale: string = "en-PH"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

export function isValidDate(val: unknown): val is Date {
    return val instanceof Date && !Number.isNaN(val.getTime());
}
