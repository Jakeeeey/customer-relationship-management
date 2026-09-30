"use client";

import React, { useState, useEffect } from "react";
import { CustomerOption } from "../types/solar.schema";
import { User, Search, MapPin, Phone, Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CustomerSelectorProps {
  selectedCustomerId: number | string;
  onSelectCustomer: (customer: CustomerOption) => void;
  selectedCustomerData?: CustomerOption | null;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  selectedCustomerData,
}) => {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/crm/customer?pageSize=200", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch customers");
        const json = await res.json();
        if (isMounted) {
          const list = (json.customers || []).map((c: any) => ({
            id: c.id,
            customer_code: c.customer_code || `CUST-${c.id}`,
            customer_name: c.customer_name || "Unnamed Customer",
            store_name: c.store_name || "",
            city: c.city || "",
            province: c.province || "",
            contact_number: c.contact_number || "",
            customer_email: c.customer_email || "",
          }));
          setCustomers(list);
        }
      } catch (err) {
        console.error("Could not load customers:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeCustomer = selectedCustomerData || customers.find(
    (c) => String(c.id) === String(selectedCustomerId)
  );

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
              1. Customer Selection
            </h3>
            <p className="text-xs text-muted-foreground">
              Select or search a registered customer to link with this solar calculation
            </p>
          </div>
        </div>

        {/* Customer Select Popover */}
        <div className="w-full sm:w-80">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "w-full justify-between h-11 px-3 text-left font-medium bg-background border-input hover:border-primary/50 transition-all",
                  !selectedCustomerId && "text-muted-foreground"
                )}
              >
                <span className="truncate">
                  {activeCustomer
                    ? `${activeCustomer.customer_name} ${activeCustomer.store_name ? `(${activeCustomer.store_name})` : ""}`
                    : "Select Customer..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] sm:w-[380px] p-0 shadow-2xl" align="end">
              <Command>
                <CommandInput
                  placeholder="Search customer by name or store..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="h-10"
                />
                <CommandList className="max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading customers...
                    </div>
                  ) : customers.length === 0 ? (
                    <CommandEmpty>No registered customers found.</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Available Customers">
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.customer_name} ${c.store_name || ""} ${c.customer_code}`}
                          onSelect={() => {
                            onSelectCustomer(c);
                            setOpen(false);
                          }}
                          className="py-2.5 px-3 cursor-pointer flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {c.customer_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.store_name ? `${c.store_name} • ` : ""}
                              {c.city || c.province || c.customer_code}
                            </p>
                          </div>
                          {String(selectedCustomerId) === String(c.id) && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Selected Customer Summary Card */}
      {activeCustomer && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/50 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="text-muted-foreground text-[10px] block uppercase font-medium">Customer / Store</span>
              <span className="font-bold text-foreground truncate block">
                {activeCustomer.customer_name} {activeCustomer.store_name ? `• ${activeCustomer.store_name}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="text-muted-foreground text-[10px] block uppercase font-medium">Location</span>
              <span className="font-medium text-foreground truncate block">
                {[activeCustomer.city, activeCustomer.province].filter(Boolean).join(", ") || "No address indicated"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="text-muted-foreground text-[10px] block uppercase font-medium">Contact Details</span>
              <span className="font-medium text-foreground truncate block">
                {activeCustomer.contact_number || activeCustomer.customer_email || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
