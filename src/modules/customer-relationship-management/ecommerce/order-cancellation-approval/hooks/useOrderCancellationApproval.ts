"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CancellationReviewAction,
  OrderCancellationApprovalRow,
} from "../types";
import {
  fetchOrderCancellationApprovals,
  submitOrderCancellationReview,
} from "../providers/fetchProviders";
import { computePendingAmount } from "../utils/businessRules";

const DEFAULT_LIMIT = 10;

export function useOrderCancellationApproval() {
  const [rows, setRows] = useState<OrderCancellationApprovalRow[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [totalRows, setTotalRows] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [selectedRow, setSelectedRow] = useState<OrderCancellationApprovalRow | null>(null);
  const [reviewerRemarks, setReviewerRemarks] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await fetchOrderCancellationApprovals({
        search: searchKeyword,
        page,
        limit,
      });

      setRows(result.data || []);
      setTotalRows(result.meta?.total ?? 0);
    } catch (err) {
      const normalized =
        err instanceof Error
          ? err
          : new Error("Failed to load sales order cancellation approvals.");
      setError(normalized);
      setRows([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, searchKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueue();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  const openReview = useCallback((row: OrderCancellationApprovalRow) => {
    setSelectedRow(row);
    setReviewerRemarks("");
  }, []);

  const closeReview = useCallback(() => {
    setSelectedRow(null);
    setReviewerRemarks("");
  }, []);

  const submitReview = useCallback(
    async (action: CancellationReviewAction) => {
      if (!selectedRow || isSubmitting) return;

      try {
        setIsSubmitting(true);
        await submitOrderCancellationReview({
          requestId: selectedRow.requestId,
          orderId: selectedRow.orderId,
          action,
          remarks: reviewerRemarks.trim(),
        });

        toast.success(
          action === "APPROVED"
            ? "Sales order cancellation approved."
            : "Sales order cancellation rejected.",
        );

        closeReview();
        await loadQueue();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to submit cancellation review.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [closeReview, isSubmitting, loadQueue, reviewerRemarks, selectedRow],
  );

  const onSearchChange = useCallback((value: string) => {
    setPage(1);
    setSearchKeyword(value);
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalRows / limit)), [limit, totalRows]);

  const stats = useMemo(
    () => ({
      queueCount: totalRows,
      visibleCount: rows.length,
      visibleAmount: computePendingAmount(rows),
    }),
    [rows, totalRows],
  );

  return {
    rows,
    searchKeyword,
    page,
    limit,
    totalRows,
    totalPages,
    isLoading,
    isSubmitting,
    error,
    selectedRow,
    reviewerRemarks,
    stats,
    setPage,
    onSearchChange,
    setReviewerRemarks,
    openReview,
    closeReview,
    refresh: loadQueue,
    approve: () => submitReview("APPROVED"),
    reject: () => submitReview("REJECTED"),
  };
}
