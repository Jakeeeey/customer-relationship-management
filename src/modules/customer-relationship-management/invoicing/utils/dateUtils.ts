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
        const d = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+') 
            ? new Date(date + 'Z') // Force UTC if missing timezone info (common for Directus)
            : new Date(date);

        if (isNaN(d.getTime())) return String(date);

        // Standard formatting using Intl for precise timezone control
        return new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: formatStr.includes("yyyy") ? "numeric" : undefined,
            month: formatStr.includes("MMM") ? "short" : formatStr.includes("MM") ? "2-digit" : undefined,
            day: formatStr.includes("dd") ? "2-digit" : undefined,
            hour: formatStr.includes("h") ? "2-digit" : undefined,
            minute: formatStr.includes("mm") ? "2-digit" : undefined,
            hour12: formatStr.includes("a"),
        }).format(d).replace(",", "");
    } catch (error) {
        console.warn("[DateUtils] PHT conversion failed:", error);
        return String(date);
    }
};

/**
 * Converts a local date string (from picker) to a UTC ISO string.
 * Used for filtering to ensure the 8-hour gap is handled.
 * 
 * @param dateStr - The date string from input (YYYY-MM-DD)
 * @param type - 'start' for 00:00:00 or 'end' for 23:59:59
 * @returns UTC ISO string
 */
export const normalizeToUTC = (dateStr: string, type: 'start' | 'end'): string => {
    if (!dateStr) return "";
    
    // Create date object in Asia/Manila context
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day, type === 'start' ? 0 : 23, type === 'start' ? 0 : 59, type === 'start' ? 0 : 59);
    
    // Shift by 8 hours manually if not using date-fns-tz
    // PHT is UTC+8, so UTC is PHT - 8 hours
    const utcDate = new Date(date.getTime() - (8 * 60 * 60 * 1000));
    return utcDate.toISOString();
};
