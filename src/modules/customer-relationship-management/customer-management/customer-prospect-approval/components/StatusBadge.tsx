import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: 'Pending' | 'Approved' | 'Rejected' | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Approved':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1 px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 gap-1 px-2 py-0.5">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case 'Pending':
    default:
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1 px-2 py-0.5">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}
