import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (value === null || value === undefined || isNaN(value)) {
        return "₱0.00";
    }
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(value);
}
