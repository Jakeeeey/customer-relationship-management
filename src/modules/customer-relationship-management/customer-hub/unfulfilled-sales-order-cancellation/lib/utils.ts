import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCardColor(index: number) {
  const colors = [
    "from-blue-50/50 to-blue-100/20 border-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 dark:border-blue-900/50 text-blue-700 dark:text-blue-400",
    "from-purple-50/50 to-purple-100/20 border-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 dark:border-purple-900/50 text-purple-700 dark:text-purple-400",
    "from-amber-50/50 to-amber-100/20 border-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 dark:border-amber-900/50 text-amber-700 dark:text-amber-400",
    "from-emerald-50/50 to-emerald-100/20 border-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400",
    "from-rose-50/50 to-rose-100/20 border-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/10 dark:border-rose-900/50 text-rose-700 dark:text-rose-400",
  ];
  return colors[index % colors.length];
}
