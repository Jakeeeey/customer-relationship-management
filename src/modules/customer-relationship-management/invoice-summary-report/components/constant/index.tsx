import { Loader, CheckCircle, XCircle } from "lucide-react";

export const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    variant: "secondary",
    icon: Loader,
    className: "px-1.5 gap-1",
    iconClassName: "h-3 w-3 animate-spin",
  },
  APPROVED: {
    label: "Approved",
    variant: "secondary",
    icon: CheckCircle,
    className: "px-1.5 gap-1",
    iconClassName: "h-3 w-3 text-green-500",
  },
  REJECTED: {
    label: "Rejected",
    variant: "secondary",
    icon: XCircle,
    className: "px-1.5 gap-1",
    iconClassName: "h-3 w-3 text-red-600",
  },
} as const;

export type Status = keyof typeof STATUS_CONFIG;
