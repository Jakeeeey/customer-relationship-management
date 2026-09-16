"use client";

/**
 * Calculates the net price using the "Chain" discount method.
 * Each discount is applied sequentially to the current running total, not cumulatively.
 * 
 * Example: Base Price 100 with discounts 7% and 2%
 * Step 1: 100 * (1 - 0.07) = 93
 * Step 2: 93 * (1 - 0.02) = 91.14
 * 
 * @param basePrice The original unit price
 * @param discounts Array of numerical percentages [7, 2, ...]
 * @returns The final net price
 */
export function calculateChainNetPrice(basePrice: number, discounts: number[]): number {
    if (!discounts || discounts.length === 0) return basePrice;

    return discounts.reduce((currentPrice, discount) => {
        const factor = 1 - (discount / 100);
        return currentPrice * factor;
    }, basePrice);
}

/**
 * Format currency to PHP
 */
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
};

/**
 * Returns a local Date representation whose fields (year, month, day, hour, minute, second)
 * match the current time in the Asia/Manila (Philippine) timezone, even if the device runs
 * in a different timezone (e.g. UTC).
 * If the device timezone is already Asia/Manila, it returns the input date unmodified.
 */
export const getPHTDate = (date: Date = new Date()): Date => {
    const isAsiaManila = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Manila';
    if (isAsiaManila) return date;

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

    // Construct local representation of Manila time
    return new Date(
        Number(partMap.year),
        Number(partMap.month) - 1,
        Number(partMap.day),
        Number(partMap.hour === '24' ? '00' : partMap.hour), // Handle edge cases in some Intl formatters
        Number(partMap.minute),
        Number(partMap.second)
    );
};

