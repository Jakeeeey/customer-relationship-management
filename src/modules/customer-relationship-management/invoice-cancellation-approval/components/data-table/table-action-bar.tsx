"use client";

import type { Table } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import * as React from "react";
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from "@/modules/customer-relationship-management/invoice-cancellation-approval/components/ui/action-bar";
import { ApprovalAction, InvoiceRow } from "../../types";

interface TasksTableActionBarProps {
  table: Table<InvoiceRow>;
  onBulkAction: (action: ApprovalAction, rows: InvoiceRow[]) => void;
}

export function TasksTableActionBar({
                                        table,
                                        onBulkAction,
                                    }: TasksTableActionBarProps) {
    // 🚀 SAFETY: Fallback to empty array if row model isn't ready
    const selectedRows = table?.getSelectedRowModel()?.rows || [];

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        table.toggleAllRowsSelected(false);
      }
    },
    [table],
  );

    const handleBulkAction = (e: React.MouseEvent, action: ApprovalAction) => {
        // 🚀 THE FIX: Stop the click from bubbling up and auto-closing the bar prematurely!
        e.preventDefault();
        e.stopPropagation();

        if (selectedRows.length === 0) return;

        const rawData = selectedRows.map((r) => r.original);
        onBulkAction(action, rawData);

        // Let the parent's confirmation modal handle clearing the selection later!
    };

    if (!table) return null; // 🚀 SAFETY: Don't crash if table prop drops

    return (
        <ActionBar open={selectedRows.length > 0} onOpenChange={onOpenChange}>
            <ActionBarSelection>
                <span className="font-medium">{selectedRows.length}</span>
                <span>selected</span>
                <ActionBarSeparator />
                {/* 🚀 FIX: Ensure the close button doesn't trigger form submits if wrapped in a form */}
                <ActionBarClose type="button">
                    <X className="w-4 h-4" />
                </ActionBarClose>
            </ActionBarSelection>

            <ActionBarGroup>
                <ActionBarItem
                    type="button" // 🚀 Prevent accidental form submissions
                    className="h-8 text-xs bg-red-700 text-white hover:bg-red-600"
                    onClick={(e: React.MouseEvent) => handleBulkAction(e, "REJECT")}
                >
                    <X className="w-4 h-4 mr-1.5" />
                    Reject
                </ActionBarItem>
                <ActionBarItem
                    type="button" // 🚀 Prevent accidental form submissions
                    className="h-8 text-xs bg-blue-700 text-white hover:bg-blue-600"
                    onClick={(e: React.MouseEvent) => handleBulkAction(e, "APPROVE")}
                >
                    <Check className="w-4 h-4 mr-1.5" />
                    Approve
                </ActionBarItem>
            </ActionBarGroup>
        </ActionBar>
    );
}
