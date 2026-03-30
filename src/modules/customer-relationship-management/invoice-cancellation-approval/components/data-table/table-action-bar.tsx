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
  const selectedRows = table.getSelectedRowModel().rows;

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        table.toggleAllRowsSelected(false);
      }
    },
    [table],
  );

  const handleBulkAction = (action: ApprovalAction) => {
    onBulkAction(
      action,
      selectedRows.map((r) => r.original),
    );
    // Selection is usually cleared in the parent after the action is confirmed
  };

  return (
    <ActionBar open={selectedRows.length > 0} onOpenChange={onOpenChange}>
      <ActionBarSelection>
        <span className="font-medium">{selectedRows.length}</span>
        <span>selected</span>
        <ActionBarSeparator />
        <ActionBarClose>
          <X />
        </ActionBarClose>
      </ActionBarSelection>
      <ActionBarGroup>
        <ActionBarItem
          className="h-8 text-xs bg-red-700 text-white hover:bg-red-600"
          onClick={() => handleBulkAction("REJECT")}
        >
          <X />
          Reject
        </ActionBarItem>
        <ActionBarItem
          className="h-8 text-xs bg-blue-700 text-white hover:bg-blue-600"
          onClick={() => handleBulkAction("APPROVE")}
        >
          <Check />
          Approve
        </ActionBarItem>
      </ActionBarGroup>
    </ActionBar>
  );
}
