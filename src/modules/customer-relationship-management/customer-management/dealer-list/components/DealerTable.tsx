//src/modules/customer-relationship-management/customer-management/dealer-list/components/DealerTable.tsx
"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Mail,
  Phone,
  MapPin,
  Pencil,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,

  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DealerRecord, DealerFilters } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SortKey =
  | "dealer_name"
  | "dealer_code"
  | "dealer_type"
  | "dealer_city"
  | "dealer_province"
  | "dealer_dateAdmitted"
  | "subscription_tier";

interface DealerTableProps {
  rows: DealerRecord[];
  page: number;
  pageSize: number;
  totalPages: number;
  filteredTotal: number;
  isLoading: boolean;
  sortBy: SortKey;
  sortDir: "asc" | "desc";

  onSort: (key: SortKey) => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onRowClick: (dealer: DealerRecord) => void;
  onEdit: (dealer: DealerRecord) => void;

  filters?: DealerFilters;
}

// ---------------------------------------------------------------------------
// Tier badge color
// ---------------------------------------------------------------------------
function tierVariant(
  tier?: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (!tier) return "outline";
  const t = tier.toLowerCase();
  if (t.includes("gold") || t.includes("premium")) return "default";
  if (t.includes("silver")) return "secondary";
  return "outline";
}

// ---------------------------------------------------------------------------
// Email Link generator
// ---------------------------------------------------------------------------
function getEmailLink(email: string): string {
  const lower = email.toLowerCase();
  if (lower.includes("gmail") || lower.includes("google")) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  }
  if (lower.includes("outlook") || lower.includes("hotmail")) {
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}`;
  }
  return `mailto:${email}`;
}


// ---------------------------------------------------------------------------
// Column sort header helper
// ---------------------------------------------------------------------------
function SortHeader({
  col,
  label,
  sortBy,
  sortDir,
  onSort,
  className = "",
}: {
  col: SortKey;
  label: string;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortBy === col;
  return (
    <TableHead
      className={`whitespace-nowrap cursor-pointer select-none group ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1 text-foreground">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
        )}
      </span>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton rows
// ---------------------------------------------------------------------------
function SkeletonRows({ count = 10 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          {/* Dealer Code / Type / Tier */}
          <TableCell>
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5 w-12 rounded-full" />
            </div>
          </TableCell>
          {/* Dealer Name */}
          <TableCell>
            <div className="flex gap-2 items-start">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </TableCell>
          {/* Location */}
          <TableCell>
            <div className="flex gap-2 items-start">


              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </TableCell>
          {/* Contacts */}
          <TableCell>
            <div className="space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>
          {/* Date Admitted */}
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          {/* Actions */}
          <TableCell className="text-right pr-6">
            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const DealerTable = React.memo(function DealerTable({
  rows,
  page,
  pageSize,
  totalPages,
  filteredTotal,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onEdit,
  filters,
}: DealerTableProps) {
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, filteredTotal);

  const getNoDataMessage = () => {
    if (!filters) return "No dealers found";

    const geoParts = [
      filters.dealer_brgy,
      filters.dealer_city,
      filters.dealer_province,
    ].filter((v) => v && v.trim() !== "" && v.toLowerCase() !== "all");

    const otherParts = [
      filters.subscription_tier,
      filters.dealer_type,
      filters.dealer_department,
    ].filter((v) => v && v.trim() !== "" && v.toLowerCase() !== "all");

    if (geoParts.length === 0 && otherParts.length === 0) {
      return "No dealers found";
    }

    let msg = "No dealer found in";
    if (geoParts.length > 0) {
      msg += " " + geoParts.join(", ");
    }
    if (otherParts.length > 0) {
      if (geoParts.length > 0) {
        msg += " or";
      }
      msg += " " + otherParts.join(", ");
    }
    return msg;
  };

  return (
    <div className="space-y-3">
      {/* ── Table ── */}
      <div className="rounded-md border border-border overflow-auto relative bg-background">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow>
              <SortHeader
                col="dealer_code"
                label="Dealer Code"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="min-w-36"
              />
              <SortHeader
                col="dealer_name"
                label="Dealer Name"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="min-w-45"
              />
              <SortHeader
                col="dealer_city"
                label="Location"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="min-w-50"
              />
              <TableHead className="text-foreground whitespace-nowrap">
                Contacts
              </TableHead>
              <SortHeader
                col="dealer_dateAdmitted"
                label="Date Admitted"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <TableHead className="text-foreground text-right pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <SkeletonRows count={pageSize > 10 ? 10 : pageSize} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-10 w-10 text-muted-foreground/30" />
                    <span className="text-sm font-medium">{getNoDataMessage()}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((dealer, i) => (
                <TableRow
                  key={dealer.dealer_id ? String(dealer.dealer_id) : `row-${i}`}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => onRowClick(dealer)}
                >
                  {/* Dealer Code / Type / Tier */}
                  <TableCell className="min-w-[150px] max-w-[200px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2" >
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {dealer.dealer_code || "—"}
                        </span>
                        {dealer.subscription_tier ? (
                          <div className="flex items-center">

                            <Badge
                              variant={tierVariant(dealer.subscription_tier)}
                              className="text-[9px] px-1.5 py-0.5 whitespace-nowrap font-medium leading-none"
                            >
                              {dealer.subscription_tier}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-foreground font-medium"></div>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground space-y-1">
                        <div>
                          Type: <span className="text-foreground font-medium">{dealer.dealer_type || "—"}</span>
                        </div>

                      </div>
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="max-w-60">
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7   flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium truncate text-sm block">
                          {dealer.dealer_name || "—"}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                          <div className="truncate">
                            TIN: {dealer.dealer_tin || "—"}
                          </div>
                          <div className="truncate">
                            REG: {dealer.dealer_registrationNumber || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Location */}
                  <TableCell className="text-xs">
                    <div className="flex items-start">
                      <div className="h-7 w-7   flex  justify-center shrink-0 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                          <div>Barangay: {dealer.dealer_brgy || "—"}</div>
                          <div>City: {dealer.dealer_city || "—"}</div>
                          <div>Province: {dealer.dealer_province || "—"}</div>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      {dealer.dealer_email && (() => {
                        const emailLink = getEmailLink(dealer.dealer_email);
                        const isWebMail = emailLink.startsWith("http");
                        return (
                          <a
                            href={emailLink}
                            target={isWebMail ? "_blank" : undefined}
                            rel={isWebMail ? "noopener noreferrer" : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-40"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            {dealer.dealer_email}
                          </a>
                        );
                      })()}
                      {dealer.dealer_contact && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {dealer.dealer_contact}
                        </span>
                      )}
                      {!dealer.dealer_email && !dealer.dealer_contact && "—"}
                    </div>
                  </TableCell>

                  {/* Date Admitted */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {dealer.dealer_dateAdmitted
                      ? new Date(dealer.dealer_dateAdmitted).toLocaleDateString(
                        "en-PH",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )
                      : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(dealer);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Row count info */}
        <p className="text-xs text-muted-foreground">
          {filteredTotal === 0 ? (
            "No records"
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {startIdx}–{endIdx}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {filteredTotal.toLocaleString()}
              </span>{" "}
              dealers
            </>
          )}
        </p>

        <div className="flex items-center gap-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:inline">
              Rows:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                onPageSizeChange(Number(v));
                onPageChange(1);
              }}
            >
              <SelectTrigger
                id="dealer-page-size"
                className="w-20 h-8 text-xs bg-background border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((v) => (
                  <SelectItem key={v} value={v.toString()} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1">
            <Button
              id="dealer-page-first"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => onPageChange(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              id="dealer-page-prev"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="w-24 text-center font-mono text-xs">
              {page} <span className="text-muted-foreground mx-0.5">/</span>{" "}
              {totalPages}
            </div>

            <Button
              id="dealer-page-next"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              id="dealer-page-last"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DealerTable;
