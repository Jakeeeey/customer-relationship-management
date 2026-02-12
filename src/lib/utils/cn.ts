import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn()
 * Standard shadcn helper: merges conditional classnames + tailwind conflict resolution.
 *
 * Usage:
 *   cn("px-2", condition && "bg-red-500")
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
