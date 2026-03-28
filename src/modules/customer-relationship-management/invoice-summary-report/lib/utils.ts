import { format } from "date-fns";

/*
 * START: FIlter helpers
 */
/**
 * Converts 0-24 hour numbers to 12-hour AM/PM strings
 */
export const format12Hour = (hour: number) => {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour;
  return `${h} ${ampm}`;
};

/**
 * Formats internal ID keys into readable labels
 */
export const formatFilterId = (id: string) => {
  if (id === "date_time") return "Time Range";
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Generates the pretty label for the filter badge values
 */
export const getFilterValueLabel = (id: string, value: unknown): string | null => {
  if (!value) return null;

  switch (id) {
    case "date_time":
      // Slider Numeric Range
      if (Array.isArray(value) && typeof value[0] === "number") {
        return `${format12Hour(value[0])} - ${format12Hour(value[1] as number)}`;
      }
      // Date Picker Range
      if (Array.isArray(value) && value[0] instanceof Date) {
        const start = format(value[0], "MMM dd");
        const value1 = value[1] as Date | undefined;
        const end = value1 ? format(value1, "MMM dd") : "Today";
        return `${start} - ${end}`;
      }
      return "Date Range";

    case "customer_name":
      return `"${value}"`;

    default:
      // Handles status, type, and generic arrays or strings
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
};
/*
 * END: Filter helpers
 */



/*
 * START: Column date time helpers
 */
export function formatDate(
  date?: string | Date,
  locale: string = "en-PH",
): string {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(
  date?: string | Date,
  locale: string = "en-PH",
): string {
  if (!date) return "N/A";

  return new Date(date).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
/*
 * END: Column date time helpers
 */
