/**
 * Formatting helpers (no external deps)
 */

export function formatCurrency(
    amount: number,
    currency: string = "PHP",
    locale: string = "en-PH"
): string {
    const safe = Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(safe);
}

export function formatNumber(
    value: number,
    locale: string = "en-PH",
    maximumFractionDigits: number = 2
): string {
    const safe = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(safe);
}

export function titleCase(input: string): string {
    return input
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}
