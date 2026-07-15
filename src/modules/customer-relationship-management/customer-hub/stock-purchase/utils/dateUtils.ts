/**
 * Formats a date string or Date object to Philippine Time (PHT).
 * 
 * @param date - The date to format (string, number, or Date)
 * @param formatStr - The date-fns format string (default: "MMM dd, yyyy h:mm a")
 * @returns Formatted string in PHT
 */
export const formatToPHT = (date: string | number | Date | null | undefined, formatStr = "MMM dd, yyyy h:mm a"): string => {
    if (!date) return "N/A";
    
    try {
        let d: Date;
        if (typeof date === 'string') {
            const literalStr = date.replace(/Z$|[+-]\d{2}:\d{2}$/, '');
            d = new Date(literalStr);
        } else {
            d = new Date(date);
        }

        if (isNaN(d.getTime())) return String(date);

        return new Intl.DateTimeFormat("en-US", {
            year: formatStr.includes("yyyy") ? "numeric" : undefined,
            month: formatStr.includes("MMM") ? "short" : formatStr.includes("MM") ? "2-digit" : undefined,
            day: formatStr.includes("dd") ? "2-digit" : undefined,
            hour: formatStr.includes("h") ? "2-digit" : undefined,
            minute: formatStr.includes("mm") ? "2-digit" : undefined,
            hour12: formatStr.includes("a"),
        }).format(d).replace(",", "");
    } catch (error) {
        console.warn("[StockPurchaseDateUtils] Literal conversion failed:", error);
        return String(date);
    }
};
