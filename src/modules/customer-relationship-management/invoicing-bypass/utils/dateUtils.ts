/**
 * Formats a date string or Date object to Philippine Time (PHT).
 * Ensures that UTC dates from Directus are correctly shifted to Asia/Manila.
 * 
 * @param date - The date to format (string, number, or Date)
 * @param formatStr - The date-fns format string (default: "MMM dd, yyyy h:mm a")
 * @returns Formatted string in PHT
 */
export const formatToPHT = (date: string | number | Date | null | undefined, formatStr = "MMM dd, yyyy h:mm a"): string => {
    if (!date) return "N/A";
    
    try {
        // Literal/Raw parsing: Remove 'Z' or timezone offsets to treat the string as local time
        let d: Date;
        if (typeof date === 'string') {
            const literalStr = date.replace(/Z$|[+-]\d{2}:\d{2}$/, '');
            d = new Date(literalStr);
        } else {
            d = new Date(date);
        }

        if (isNaN(d.getTime())) return String(date);

        // Format as is (Literal) - we removed the timeZone: "Asia/Manila" constraint
        return new Intl.DateTimeFormat("en-US", {
            year: formatStr.includes("yyyy") ? "numeric" : undefined,
            month: formatStr.includes("MMM") ? "short" : formatStr.includes("MM") ? "2-digit" : undefined,
            day: formatStr.includes("dd") ? "2-digit" : undefined,
            hour: formatStr.includes("h") ? "2-digit" : undefined,
            minute: formatStr.includes("mm") ? "2-digit" : undefined,
            hour12: formatStr.includes("a"),
        }).format(d).replace(",", "");
    } catch (error) {
        console.warn("[DateUtils] Literal conversion failed:", error);
        return String(date);
    }
};

/**
 * Converts a local date string (from picker) to a Literal ISO string for API filtering.
 * No longer shifts by 8 hours to maintain "Literal" consistency.
 * 
 * @param dateStr - The date string from input (YYYY-MM-DD)
 * @param type - 'start' for 00:00:00 or 'end' for 23:59:59
 * @returns Literal ISO string
 */
export const normalizeToUTC = (dateStr: string, type: 'start' | 'end'): string => {
    if (!dateStr) return "";
    
    // Truly literal: just append the time without letting the Date object shift it to UTC
    const time = type === 'start' ? 'T00:00:00' : 'T23:59:59';
    return `${dateStr}${time}`;
};
