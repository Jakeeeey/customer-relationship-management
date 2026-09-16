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
