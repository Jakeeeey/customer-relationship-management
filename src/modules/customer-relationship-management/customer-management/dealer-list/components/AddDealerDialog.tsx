//src/modules/customer-relationship-management/customer-management/dealer-list/components/AddDealerDialog.tsx
"use client";

/**
 * AddDealerDialog
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tab form dialog for registering a new dealer.
 * Tabs: BASIC | LOCATION | CONTACT | REGISTRATION
 *
 * Location fields (Province / City-Municipality / Barangay) use live PSGC
 * data from psgc.gitlab.io — same approach as CustomerFormSheet in IDS.
 * Fetching is handled internally via useEffects watching selected values
 * (no proxy route or Popover/Command needed).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  AlertCircle,
  Handshake,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createDealer, updateDealer } from "../providers/fetchProvider";
import type { DealerLookupOptions, DealerRecord } from "../types";
import PSGCCombobox, { PSGCOption } from "./PSGCCombobox";

// ---------------------------------------------------------------------------
// PSGC base URL (same as IDS project)
// ---------------------------------------------------------------------------
const PSGC = "https://psgc.gitlab.io/api";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AddDealerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: DealerRecord) => void;
  options: DealerLookupOptions;
  dealerToEdit?: DealerRecord | null;
}

// ---------------------------------------------------------------------------
// Initial form state
// ---------------------------------------------------------------------------
const EMPTY_FORM: Partial<DealerRecord> = {
  dealer_name: "",
  dealer_code: "",
  dealer_type: "",
  dealer_address: "",
  dealer_brgy: "",
  dealer_city: "",
  dealer_province: "",
  dealer_zipCode: "",
  dealer_registrationNumber: "",
  dealer_tin: "",
  dealer_dateAdmitted: "",
  dealer_contact: "",
  dealer_email: "",
  dealer_outlook: "",
  dealer_gmail: "",
  dealer_department: "",
  dealer_facebook: "",
  dealer_website: "",
  dealer_tags: "",
  subscription_tier: "",
  dealer_logo: "",
};

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------
type TabId = "basic" | "location" | "contact" | "registration";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "BASIC", icon: Building2 },
  { id: "location", label: "LOCATION", icon: MapPin },
  { id: "contact", label: "CONTACT", icon: Phone },
  { id: "registration", label: "REGISTRATION", icon: FileText },
];

// ---------------------------------------------------------------------------
// Styled field label — uppercase, small, tracking, matching reference image
// ---------------------------------------------------------------------------
function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1.5"
    >
      {children}
      {required && (
        <span className="text-destructive ml-0.5 normal-case">*</span>
      )}
    </Label>
  );
}

// ---------------------------------------------------------------------------
// Text input field
// ---------------------------------------------------------------------------
function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  required = false,
  colSpan,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  colSpan?: "full";
  error?: string;
}) {
  const hasError = Boolean(error);
  return (
    <div className={colSpan === "full" ? "col-span-2" : ""}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`h-10 text-sm border-border/80 bg-background shadow-sm transition-colors ${hasError
          ? "border-destructive ring-1 ring-destructive/20 bg-destructive/5 focus-visible:ring-destructive/40"
          : ""
          }`}
      />
      {hasError && (
        <div
          id={`${id}-error`}
          className="mt-1.5 flex items-start gap-1.5 text-[11px] text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input formatters (Registration Number + TIN)
// ---------------------------------------------------------------------------
const formatRegistrationNumber = (raw: string) => {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const lettersMatch = cleaned.match(/^[A-Z]+/);
  const letters = lettersMatch?.[0] ?? "";
  const digits = cleaned.slice(letters.length).replace(/\D/g, "");

  const groups: string[] = [];
  if (digits.length > 0) {
    groups.push(digits.slice(0, 4));
    if (digits.length > 4) groups.push(digits.slice(4, 7));
    if (digits.length > 7) groups.push(digits.slice(7, 11));
  }

  const joinedDigits = groups.filter(Boolean).join("-");
  if (!letters) return joinedDigits;
  if (!joinedDigits) return letters;
  return `${letters}-${joinedDigits}`;
};

const formatTin = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  const groups = digits.match(/.{1,3}/g) ?? [];
  return groups.join("-");
};

// ---------------------------------------------------------------------------
// Select field with free-text fallback
// ---------------------------------------------------------------------------
function SelectField({
  id,
  label,
  value,
  onChange,
  items,
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: string[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>

      <Select
        value={value}
        onValueChange={(v) => onChange(v === "__other__" ? "" : v)}
      >
        <SelectTrigger
          id={id}
          className="h-10 text-sm border-border/80 bg-background w-full"
        >
          <SelectValue placeholder={placeholder ?? `Select ${label}`} />
        </SelectTrigger>
        <SelectContent>

          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  );
}

// ---------------------------------------------------------------------------
// PSGC field with label wrapper
// ---------------------------------------------------------------------------
function PSGCField({
  id,
  label,
  value,
  onSelect,
  items,
  placeholder,
  disabled = false,
  isLoading = false,
}: {
  id: string;
  label: string;
  value: string;
  onSelect: (name: string, code: string) => void;
  items: PSGCOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <PSGCCombobox
        id={id}
        value={value}
        onSelect={onSelect}
        items={items}
        placeholder={placeholder ?? `Select ${label}`}
        disabled={disabled}
        isLoading={isLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AddDealerDialog = function AddDealerDialog({
  open,
  onClose,
  onSuccess,
  options,
  dealerToEdit,
}: AddDealerDialogProps) {
  const [form, setForm] = useState<Partial<DealerRecord>>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (dealerToEdit) {
        const cleaned: Partial<DealerRecord> = {};
        Object.entries(dealerToEdit).forEach(([k, v]) => {
          if (k === "dealer_registrationNumber") {
            cleaned[k as keyof DealerRecord] = v
              ? formatRegistrationNumber(String(v))
              : "";
            return;
          }
          if (k === "dealer_tin") {
            cleaned[k as keyof DealerRecord] = v ? formatTin(String(v)) : "";
            return;
          }
          cleaned[k as keyof DealerRecord] = v === null ? "" : v;
        });
        setForm({ ...EMPTY_FORM, ...cleaned });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setActiveTab("basic");
    }
  }, [open, dealerToEdit]);

  const validateField = (field: keyof DealerRecord, val: string): string => {
    const trimmed = val ? val.trim() : "";

    if (field === "dealer_code" && !trimmed) {
      return "Dealer code is required.";
    }
    if (field === "dealer_name" && !trimmed) {
      return "Dealer name is required.";
    }
    if (field === "dealer_contact" && !trimmed) {
      return "Phone / Mobile number is required.";
    }

    if (!trimmed) return "";

    switch (field) {
      case "dealer_code":
        if (!trimmed) {
          return "Dealer code is required.";
        }
        break;

      case "dealer_zipCode":
        if (trimmed && !/^\d{4}$/.test(trimmed)) {
          return `Enter a valid ZIP code.

Example:
• 1600`;
        }
        break;

      case "dealer_contact":
        if (trimmed && !/^(\+63|0)9\d{9}$/.test(trimmed)) {
          return `Enter a valid Philippine mobile number.

Examples:
• 09171234567
• +639171234567`;
        }
        break;

      case "dealer_email":
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return `Enter a valid email address.

Example:
• user@example.com`;
        }
        break;

      case "dealer_outlook":
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return `Enter a valid email address.

Example:
• name@outlook.com
• name@company.com`;
        }
        break;

      case "dealer_gmail":
        if (trimmed && !/^[^\s@]+@gmail\.com$/i.test(trimmed)) {
          return `Use a valid Gmail address.

Example:
• user@gmail.com`;
        }
        break;

      case "dealer_website":
        if (
          trimmed &&
          !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}([\/\?#]\S*)?$/.test(trimmed)
        ) {
          return `Enter a valid website URL.

Examples:
• company.com
• www.company.ph
• https://company.com`;
        }
        break;

      case "dealer_facebook":
        if (
          trimmed &&
          !/^(https?:\/\/)?(www\.)?facebook\.com\/[A-Za-z0-9.\-_/]+$/i.test(trimmed) &&
          !/^[A-Za-z0-9.\-_/]+$/.test(trimmed)
        ) {
          return `Enter a valid Facebook page URL or username.

Examples:
• yourpage
• facebook.com/yourpage
• https://facebook.com/yourpage`;
        }
        break;

      case "dealer_registrationNumber":
        if (trimmed) {
          const normalized = trimmed.replace(/[^A-Za-z0-9]/g, "");
          if (normalized.length < 5 || normalized.length > 30) {
            return `Registration number must be 5–30 characters.

Allowed:
• Letters
• Numbers
• Hyphens`;
          }
          if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
            return `Registration number must be 5–30 characters.

Allowed:
• Letters
• Numbers
• Hyphens`;
          }
        }
        break;

      case "dealer_tin":
        if (trimmed) {
          const digits = trimmed.replace(/\D/g, "");
          if (!/^\d{9,12}$/.test(digits)) {
            return `Enter a valid TIN number.

Accepted:
• 9–12 digits only`;
          }
        }
        break;

      default:
        break;
    }
    return "";
  };

  const handleBlur = (field: keyof DealerRecord) => {
    const val = String(form[field] ?? "");
    const err = validateField(field, val);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[field] = err;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/crm/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        dealer_logo: data.id || data.data?.id || "",
      }));
      toast.success("Logo uploaded successfully!");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderImagePreview = (imageId: string | null | undefined) => {
    if (!imageId || imageId.trim() === "") return null;

    const isUrl = imageId.startsWith("http");
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8055";
    const imageUrl = isUrl ? imageId : `${baseUrl}/assets/${imageId}`;

    return (
      <div className="mt-4 relative w-full sm:w-62.5 aspect-video rounded-xl overflow-hidden border border-border shadow-sm group bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Dealer Logo Preview"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x300/e2e8f0/64748b?text=Image+Not+Found";
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2 pt-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-white truncate">
            Dealer Logo
          </p>
        </div>
      </div>
    );
  };

  // ── PSGC lists + loading flags (mirror IDS pattern exactly) ──────────────
  const [provincesList, setProvincesList] = useState<PSGCOption[]>([]);
  const [citiesList, setCitiesList] = useState<PSGCOption[]>([]);
  const [barangaysList, setBarangaysList] = useState<PSGCOption[]>([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);

  const selectedProvince = String(form.dealer_province ?? "");
  const selectedCity = String(form.dealer_city ?? "");

  // ── Fetch provinces when dialog opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const run = async () => {
      setIsLoadingProvinces(true);
      try {
        const res = await fetch(`${PSGC}/provinces/`);
        if (!res.ok) throw new Error("Failed to fetch provinces");
        const data: { code: string; name: string }[] = await res.json();
        if (isMounted) {
          setProvincesList(
            data
              .map((p) => ({ code: p.code, name: p.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch {
        if (isMounted) toast.error("Could not load provinces");
      } finally {
        if (isMounted) setIsLoadingProvinces(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // ── Fetch cities when province changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedProvince || provincesList.length === 0) {
      setCitiesList([]);
      return;
    }

    const provObj = provincesList.find((p) => p.name === selectedProvince);
    if (!provObj) return;

    let isMounted = true;

    const run = async () => {
      setIsLoadingCities(true);
      try {
        const res = await fetch(
          `${PSGC}/provinces/${provObj.code}/cities-municipalities/`,
        );
        if (!res.ok) throw new Error("Failed to fetch cities");
        const data: { code: string; name: string }[] = await res.json();
        if (isMounted) {
          setCitiesList(
            data
              .map((c) => ({ code: c.code, name: c.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch {
        if (isMounted) toast.error("Could not load cities");
      } finally {
        if (isMounted) setIsLoadingCities(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [selectedProvince, provincesList]);

  // ── Fetch barangays when city changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedCity || citiesList.length === 0) {
      setBarangaysList([]);
      return;
    }

    const cityObj = citiesList.find((c) => c.name === selectedCity);
    if (!cityObj) return;

    let isMounted = true;

    const run = async () => {
      setIsLoadingBarangays(true);
      try {
        const res = await fetch(
          `${PSGC}/cities-municipalities/${cityObj.code}/barangays/`,
        );
        if (!res.ok) throw new Error("Failed to fetch barangays");
        const data: { code: string; name: string }[] = await res.json();
        if (isMounted) {
          setBarangaysList(
            data
              .map((b) => ({ code: b.code, name: b.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch {
        if (isMounted) toast.error("Could not load barangays");
      } finally {
        if (isMounted) setIsLoadingBarangays(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [selectedCity, citiesList]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const set = useCallback(
    (field: keyof DealerRecord) => (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleRegistrationChange = (raw: string) =>
    set("dealer_registrationNumber")(formatRegistrationNumber(raw));

  const handleTinChange = (raw: string) => set("dealer_tin")(formatTin(raw));

  // Province → clear city & barangay
  const handleProvinceSelect = (name: string) => {
    setForm((prev) => ({
      ...prev,
      dealer_province: name,
      dealer_city: "",
      dealer_brgy: "",
    }));
    setCitiesList([]);
    setBarangaysList([]);
  };

  // City → clear barangay
  const handleCitySelect = (name: string) => {
    setForm((prev) => ({ ...prev, dealer_city: name, dealer_brgy: "" }));
    setBarangaysList([]);
  };

  const handleBrgySelect = (name: string) => {
    setForm((prev) => ({ ...prev, dealer_brgy: name }));
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setActiveTab("basic");
    setProvincesList([]);
    setCitiesList([]);
    setBarangaysList([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const fieldsToValidate: (keyof DealerRecord)[] = [
      "dealer_code",
      "dealer_name",
      "dealer_zipCode",
      "dealer_contact",
      "dealer_email",
      "dealer_outlook",
      "dealer_gmail",
      "dealer_website",
      "dealer_facebook",
      "dealer_registrationNumber",
      "dealer_tin",
    ];

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, String(form[f] ?? ""));
      if (err) {
        newErrors[f] = err;
      }
    });

    if (!form.dealer_code?.trim()) {
      newErrors["dealer_code"] = "Dealer Code is required";
    }
    if (!form.dealer_name?.trim()) {
      newErrors["dealer_name"] = "Dealer Name is required";
    }
    if (!form.dealer_contact?.trim()) {
      newErrors["dealer_contact"] = "Phone / Mobile number is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrField = Object.keys(newErrors)[0];
      toast.error(`Validation failed: ${newErrors[firstErrField]}`);

      // Auto-switch tabs to show the error
      if (["dealer_code"].includes(firstErrField)) {
        setActiveTab("basic");
      } else if (["dealer_zipCode"].includes(firstErrField)) {
        setActiveTab("location");
      } else if (
        [
          "dealer_contact",
          "dealer_email",
          "dealer_outlook",
          "dealer_gmail",
          "dealer_website",
          "dealer_facebook",
        ].includes(firstErrField)
      ) {
        setActiveTab("contact");
      } else if (
        ["dealer_registrationNumber", "dealer_tin"].includes(firstErrField)
      ) {
        setActiveTab("registration");
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<DealerRecord> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (k === "dealer_id") return;
        if (typeof v === "string") {
          payload[k as keyof DealerRecord] = v.trim() === "" ? null : v.trim();
        } else {
          payload[k as keyof DealerRecord] = v;
        }
      });

      if (dealerToEdit?.dealer_id) {
        const updated = await updateDealer(dealerToEdit.dealer_id, payload);
        toast.success(
          `Dealer "${updated.dealer_name ?? form.dealer_code}" updated`,
        );
        onSuccess(updated);
      } else {
        const created = await createDealer(payload);
        toast.success(
          `Dealer "${created.dealer_name ?? form.dealer_code}" created`,
        );
        onSuccess(created);
      }
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save dealer";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentTabIdx = TABS.findIndex((t) => t.id === activeTab);

  // ── Tab content ───────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="grid grid-cols-2 gap-6 ">
            <TextField
              id="add-dealer-code"
              label="Dealer Code"
              value={String(form.dealer_code ?? "")}
              onChange={set("dealer_code")}
              onBlur={() => handleBlur("dealer_code")}
              error={errors.dealer_code}
              placeholder="e.g. DLR-001"
              required
            />
            <TextField
              id="add-dealer-name"
              label="Dealer Name"
              value={String(form.dealer_name ?? "")}
              onChange={set("dealer_name")}
              onBlur={() => handleBlur("dealer_name")}
              error={errors.dealer_name}
              placeholder="e.g. ABC Motors Inc."
              required
            />
            <SelectField
              id="add-dealer-type"
              label="Dealer Type"
              value={String(form.dealer_type ?? "")}
              onChange={set("dealer_type")}
              items={options.types}
              placeholder="Select Type"
            />
            <SelectField
              id="add-dealer-department"
              label="Department"
              value={String(form.dealer_department ?? "")}
              onChange={set("dealer_department")}
              items={options.departments}
              placeholder="Select Department"
            />
            <SelectField
              id="add-dealer-tier"
              label="Subscription Tier"
              value={String(form.subscription_tier ?? "")}
              onChange={set("subscription_tier")}
              items={options.tiers}
              placeholder="Select Subscription Tier"
            />
            <TextField
              id="add-dealer-date-admitted"
              label="Date Admitted"
              value={String(form.dealer_dateAdmitted ?? "")}
              onChange={set("dealer_dateAdmitted")}
              type="date"
            />
            <div className="col-span-2">
              <FieldLabel htmlFor="add-dealer-logo">
                Dealer Logo (UUID or URL)
              </FieldLabel>
              <div className="flex gap-2 items-center">
                <Input
                  id="add-dealer-logo"
                  className="h-10 border-border/80 bg-background font-mono text-xs flex-1"
                  placeholder="Paste Directus UUID or URL..."
                  value={String(form.dealer_logo ?? "")}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dealer_logo: e.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 border-dashed border-primary text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UploadCloud className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              {renderImagePreview(form.dealer_logo)}
            </div>
            <TextField
              id="add-dealer-tags"
              label="Tags (comma-separated)"
              value={String(form.dealer_tags ?? "")}
              onChange={set("dealer_tags")}
              placeholder="e.g. active, priority, metro"
              colSpan="full"
            />
          </div>
        );

      case "location":
        return (
          <div className="grid grid-cols-2 gap-6">
            <PSGCField
              id="add-dealer-province"
              label="Province"
              value={String(form.dealer_province ?? "")}
              onSelect={(name) => handleProvinceSelect(name)}
              items={provincesList}
              placeholder="Select province"
              isLoading={isLoadingProvinces}
            />
            <PSGCField
              id="add-dealer-city"
              label="City / Municipality"
              value={String(form.dealer_city ?? "")}
              onSelect={(name) => handleCitySelect(name)}
              items={citiesList}
              placeholder={
                selectedProvince ? "Select city" : "Select province first"
              }
              disabled={!selectedProvince}
              isLoading={isLoadingCities}
            />
            <PSGCField
              id="add-dealer-brgy"
              label="Barangay"
              value={String(form.dealer_brgy ?? "")}
              onSelect={(name) => handleBrgySelect(name)}
              items={barangaysList}
              placeholder={
                selectedCity ? "Select barangay" : "Select city first"
              }
              disabled={!selectedCity}
              isLoading={isLoadingBarangays}
            />
            <TextField
              id="add-dealer-zip"
              label="ZIP Code"
              value={String(form.dealer_zipCode ?? "")}
              onChange={set("dealer_zipCode")}
              onBlur={() => handleBlur("dealer_zipCode")}
              error={errors.dealer_zipCode}
              placeholder="e.g. 1200"
            />
            <TextField
              id="add-dealer-address"
              label="Address"
              value={String(form.dealer_address ?? "")}
              onChange={set("dealer_address")}
              placeholder="e.g. 123 Rizal Street"
              colSpan="full"
            />
          </div>
        );

      case "contact":
        return (
          <div className="grid grid-cols-2 gap-6">
            <TextField
              id="add-dealer-contact"
              label="Phone / Mobile"
              value={String(form.dealer_contact ?? "")}
              onChange={set("dealer_contact")}
              onBlur={() => handleBlur("dealer_contact")}
              error={errors.dealer_contact}
              placeholder="e.g. 09XX-XXX-XXXX"
              required
            />
            <TextField
              id="add-dealer-email"
              label="Email"
              value={String(form.dealer_email ?? "")}
              onChange={set("dealer_email")}
              onBlur={() => handleBlur("dealer_email")}
              error={errors.dealer_email}
              placeholder="e.g. dealer@example.com"
              type="email"
            />
            <TextField
              id="add-dealer-outlook"
              label="Outlook"
              value={String(form.dealer_outlook ?? "")}
              onChange={set("dealer_outlook")}
              onBlur={() => handleBlur("dealer_outlook")}
              error={errors.dealer_outlook}
              placeholder="Outlook address"
              type="email"
            />
            <TextField
              id="add-dealer-gmail"
              label="Gmail"
              value={String(form.dealer_gmail ?? "")}
              onChange={set("dealer_gmail")}
              onBlur={() => handleBlur("dealer_gmail")}
              error={errors.dealer_gmail}
              placeholder="Gmail address"
              type="email"
            />
            <TextField
              id="add-dealer-website"
              label="Website"
              value={String(form.dealer_website ?? "")}
              onChange={set("dealer_website")}
              onBlur={() => handleBlur("dealer_website")}
              error={errors.dealer_website}
              placeholder="e.g. example.com or https://example.com"
              type="text"
            />
            <TextField
              id="add-dealer-facebook"
              label="Facebook"
              value={String(form.dealer_facebook ?? "")}
              onChange={set("dealer_facebook")}
              onBlur={() => handleBlur("dealer_facebook")}
              error={errors.dealer_facebook}
              placeholder="e.g. yourpage or facebook.com/yourpage"
            />
          </div>
        );

      case "registration":
        return (
          <div className="grid grid-cols-2 gap-6">
            <TextField
              id="add-dealer-reg-number"
              label="Registration Number"
              value={String(form.dealer_registrationNumber ?? "")}
              onChange={handleRegistrationChange}
              onBlur={() => handleBlur("dealer_registrationNumber")}
              error={errors.dealer_registrationNumber}
              placeholder="e.g. REG-2024-001"
            />
            <TextField
              id="add-dealer-tin"
              label="TIN"
              value={String(form.dealer_tin ?? "")}
              onChange={handleTinChange}
              onBlur={() => handleBlur("dealer_tin")}
              error={errors.dealer_tin}
              placeholder="e.g. 123-456-789-000"
            />
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="right"
        className="w-1/2 sm:max-w-1/2 p-0 overflow-hidden duration-500 flex flex-col gap-5 border-l border-border shadow-xl h-full "
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-7 py-6 border-b bg-background">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-xl font-extrabold tracking-tight uppercase leading-none">
              {dealerToEdit ? "Edit Dealer" : "New Dealer"}
            </SheetTitle>
            <SheetDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
              {dealerToEdit
                ? "Update dealer profile details"
                : "Create a new dealer profile"}
            </SheetDescription>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div className="px-7 bg-background">
          <div className="inline-flex w-full rounded-lg bg-muted p-1 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const hasError = (() => {
                if (id === "basic") return !!errors.dealer_code || !!errors.dealer_name;
                if (id === "location") return !!errors.dealer_zipCode;
                if (id === "contact") {
                  return (
                    !!errors.dealer_contact ||
                    !!errors.dealer_email ||
                    !!errors.dealer_outlook ||
                    !!errors.dealer_gmail ||
                    !!errors.dealer_website ||
                    !!errors.dealer_facebook
                  );
                }
                if (id === "registration") {
                  return (
                    !!errors.dealer_registrationNumber || !!errors.dealer_tin
                  );
                }
                return false;
              })();

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={[
                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-150 select-none",
                    isActive
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    hasError ? "text-destructive hover:text-destructive" : "",
                  ].join(" ")}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${hasError ? "text-destructive" : ""}`}
                  />
                  <span className="hidden sm:inline">{label}</span>
                  {hasError && (
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Form body ── */}
        <form
          id="add-dealer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-7 py-6 bg-muted/30"
        >
          {renderTab()}
        </form>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-7 py-4 border-t bg-background shrink-0 gap-3">
          {/* Tab prev / next navigation */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-xs text-muted-foreground"
              disabled={currentTabIdx === 0}
              onClick={() => setActiveTab(TABS[currentTabIdx - 1].id)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {currentTabIdx > 0 ? TABS[currentTabIdx - 1].label : ""}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-xs text-muted-foreground"
              disabled={currentTabIdx === TABS.length - 1}
              onClick={() => setActiveTab(TABS[currentTabIdx + 1].id)}
            >
              <span className="hidden sm:inline">
                {currentTabIdx < TABS.length - 1
                  ? TABS[currentTabIdx + 1].label
                  : ""}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              id="add-dealer-cancel"
              type="button"
              variant="outline"
              className="h-10 px-6 font-semibold uppercase text-xs tracking-wider"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="add-dealer-submit"
              type="submit"
              form="add-dealer-form"
              disabled={submitting}
              className="h-10 px-8 font-semibold uppercase text-xs tracking-wider bg-primary hover:bg-primary/90"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : dealerToEdit ? (
                "Save Changes"
              ) : (
                "Create Dealer"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default React.memo(AddDealerDialog);
