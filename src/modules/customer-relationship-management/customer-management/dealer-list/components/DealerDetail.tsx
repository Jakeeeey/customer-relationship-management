//src/modules/customer-relationship-management/customer-management/dealer-list/components/DealerDetail.tsx
"use client";

import React from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Facebook,
  Calendar,
  Hash,
  Tag,
  Layers3,
  BadgeCheck,
  FileText,
  PencilIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DealerRecord } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DealerDetailProps {
  dealer: DealerRecord | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

// ---------------------------------------------------------------------------
// Small detail row
// ---------------------------------------------------------------------------
function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
  muted = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="shrink-0 mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-sm break-all leading-snug ${mono ? "font-mono" : ""} ${muted ? "text-muted-foreground" : "text-foreground"
            }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function withFallback(value: string | null | undefined, label: string) {
  const trimmed = String(value ?? "").trim();
  if (trimmed) {
    return { value: trimmed, muted: false };
  }
  return { value: `Unknown ${label}`, muted: true };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DealerDetail = React.memo(function DealerDetail({
  dealer,
  open,
  onClose,
  onEdit,
}: DealerDetailProps) {
  const [activeDealer, setActiveDealer] = React.useState<DealerRecord | null>(null);

  React.useEffect(() => {
    if (dealer) {
      setActiveDealer(dealer);
    }
  }, [dealer]);

  if (!activeDealer) return null;

  const fullAddress = [
    activeDealer.dealer_address,
    activeDealer.dealer_brgy,
    activeDealer.dealer_city,
    activeDealer.dealer_province,
    activeDealer.dealer_zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const cityDisplay = withFallback(activeDealer.dealer_city, "City");
  const provinceDisplay = withFallback(activeDealer.dealer_province, "Province");
  const zipDisplay = withFallback(activeDealer.dealer_zipCode, "ZIP Code");

  const phoneDisplay = withFallback(activeDealer.dealer_contact, "Phone");

  const registrationDisplay = withFallback(
    activeDealer.dealer_registrationNumber,
    "Registration Number",
  );
  const tinDisplay = withFallback(activeDealer.dealer_tin, "TIN");
  const dateAdmittedDisplay = withFallback(
    activeDealer.dealer_dateAdmitted
      ? new Date(activeDealer.dealer_dateAdmitted).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "",
    "Date Admitted",
  );

  const departmentDisplay = withFallback(
    activeDealer.dealer_department,
    "Department",
  );

  const resolvedType =
    activeDealer.dealer_type ||
    (activeDealer.dealer_type_id && typeof activeDealer.dealer_type_id === "object"
      ? (activeDealer.dealer_type_id as { type_name?: string }).type_name
      : undefined);

  const resolvedTier =
    activeDealer.subscription_tier ||
    (activeDealer.subscription_id && typeof activeDealer.subscription_id === "object"
      ? (activeDealer.subscription_id as { name?: string }).name
      : undefined);

  const typeDisplay = withFallback(
    resolvedType,
    "Type",
  );

  const tierDisplay = withFallback(
    resolvedTier,
    "Subscription",
  );

  const tagList = String(activeDealer.dealer_tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const renderLinkRow = (
    icon: React.ElementType,
    label: string,
    value: string | null | undefined,
  ) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      const fallback = withFallback("", label);
      return (
        <DetailRow
          icon={icon}
          label={label}
          value={fallback.value}
          muted={fallback.muted}
        />
      );
    }
    let href = trimmed;
    if (label.toLowerCase() === "facebook") {
      const lower = trimmed.toLowerCase();
      if (lower.startsWith("http://") || lower.startsWith("https://")) {
        href = trimmed;
      } else if (lower.includes("facebook.com")) {
        href = `https://${trimmed}`;
      } else {
        href = `https://facebook.com/${trimmed}`;
      }
    } else {
      href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
          {React.createElement(icon, {
            className: "h-3.5 w-3.5 text-muted-foreground",
          })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {trimmed}
          </a>
        </div>
      </div>
    );
  };

  const renderEmailRow = (
    label: string,
    value: string | null | undefined,
  ) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      const fallback = withFallback("", label);
      return (
        <DetailRow
          icon={Mail}
          label={label}
          value={fallback.value}
          muted={fallback.muted}
        />
      );
    }

    const lower = trimmed.toLowerCase();
    const labelLower = label.toLowerCase();

    // Determine compose target:
    // 1. Check the field label (Gmail / Outlook field)
    // 2. Fallback: sniff the email domain
    let emailLink: string;
    if (labelLower.includes("gmail") || lower.includes("gmail") || lower.includes("googlemail")) {
      emailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(trimmed)}`;
    } else if (
      labelLower.includes("outlook") ||
      lower.includes("outlook") ||
      lower.includes("hotmail") ||
      lower.includes("live.com")
    ) {
      emailLink = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(trimmed)}`;
    } else {
      emailLink = `mailto:${trimmed}`;
    }

    const isWebMail = emailLink.startsWith("http");

    return (
      <div className="flex items-start gap-3 py-2">
        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <a
            href={emailLink}
            target={isWebMail ? "_blank" : undefined}
            rel={isWebMail ? "noopener noreferrer" : undefined}
            className="text-sm text-primary hover:underline break-all"
          >
            {trimmed}
          </a>
        </div>
      </div>
    );
  };

  const renderAddressRow = (address: string | null | undefined) => {
    const trimmed = String(address ?? "").trim();
    if (!trimmed) {
      const fallback = withFallback("", "Address");
      return (
        <DetailRow
          icon={MapPin}
          label="Address"
          value={fallback.value}
          muted={fallback.muted}
        />
      );
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Address
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-words leading-snug"
          >
            {trimmed}
          </a>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-1/2 sm:max-w-1/2 p-0 overflow-hidden flex flex-col gap-5 border-l border-border shadow-xl h-full"
      >
        {/* ── Header ── */}
        <div className="p-5 pb-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Logo / Avatar */}
              <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {activeDealer.dealer_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      activeDealer.dealer_logo.startsWith("http")
                        ? activeDealer.dealer_logo
                        : `${process.env.NEXT_PUBLIC_API_BASE_URL ||
                        "http://localhost:8055"
                        }/assets/${activeDealer.dealer_logo}`
                    }
                    alt={activeDealer.dealer_name ?? "logo"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-bold leading-tight truncate">
                  {activeDealer.dealer_name || "Unknown Dealer"}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {activeDealer.dealer_code && (
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] px-2 py-0.5"
                    >
                      {activeDealer.dealer_code}
                    </Badge>
                  )}
                  {resolvedType && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5"
                    >
                      {resolvedType}
                    </Badge>
                  )}
                  {resolvedTier && (
                    <Badge className="text-[10px] px-2 py-0.5 bg-primary/90">
                      {resolvedTier}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Location */}
            <section className="rounded-lg border bg-background/70 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Location
              </h3>
              {renderAddressRow(fullAddress)}
              <DetailRow
                icon={MapPin}
                label="City"
                value={cityDisplay.value}
                muted={cityDisplay.muted}
              />
              <DetailRow
                icon={MapPin}
                label="Province"
                value={provinceDisplay.value}
                muted={provinceDisplay.muted}
              />
              <DetailRow
                icon={Hash}
                label="ZIP Code"
                value={zipDisplay.value}
                muted={zipDisplay.muted}
              />
            </section>

            {/* Contact */}
            <section className="rounded-lg border bg-background/70 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Contact
              </h3>
              <DetailRow
                icon={Phone}
                label="Phone"
                value={phoneDisplay.value}
                muted={phoneDisplay.muted}
              />
              {renderEmailRow("Email", activeDealer.dealer_email)}
              {renderEmailRow("Outlook", activeDealer.dealer_outlook)}
              {renderEmailRow("Gmail", activeDealer.dealer_gmail)}
              {renderLinkRow(Globe, "Website", activeDealer.dealer_website)}
              {renderLinkRow(Facebook, "Facebook", activeDealer.dealer_facebook)}
            </section>

            {/* Registration */}
            <section className="rounded-lg border bg-background/70 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Registration
              </h3>
              <DetailRow
                icon={FileText}
                label="Registration Number"
                value={registrationDisplay.value}
                muted={registrationDisplay.muted}
                mono
              />
              <DetailRow
                icon={Hash}
                label="TIN"
                value={tinDisplay.value}
                muted={tinDisplay.muted}
                mono
              />
              <DetailRow
                icon={Calendar}
                label="Date Admitted"
                value={dateAdmittedDisplay.value}
                muted={dateAdmittedDisplay.muted}
              />
            </section>

            {/* Classification */}
            <section className="rounded-lg border bg-background/70 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Classification
              </h3>
              <DetailRow
                icon={Building2}
                label="Type"
                value={typeDisplay.value}
                muted={typeDisplay.muted}
              />
              <DetailRow
                icon={Layers3}
                label="Department"
                value={departmentDisplay.value}
                muted={departmentDisplay.muted}
              />
              <DetailRow
                icon={BadgeCheck}
                label="Subscription"
                value={tierDisplay.value}
                muted={tierDisplay.muted}
              />
              {tagList.length > 0 ? (
                <div className="flex items-start gap-3 py-2">
                  <div className="shrink-0 mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tagList.map((tag) => (
                        <Badge
                          key={tag.trim()}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <DetailRow icon={Tag} label="Tags" value="Unknown Tags" muted />
              )}
            </section>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 p-10">
          <Button
            id="edit-dealer-trigger"
            type="button"
            onClick={onEdit}
            className="h-12 px-8 font-semibold uppercase text-xs tracking-wider bg-primary hover:bg-primary/90"
          >
            <PencilIcon className="h-4 w-4" />
            Edit Dealer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default DealerDetail;
