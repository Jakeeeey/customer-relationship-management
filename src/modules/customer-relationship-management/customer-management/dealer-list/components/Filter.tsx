//src/modules/customer-relationship-management/customer-management/dealer-list/components/Filter.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronsUpDown, Check, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import type { DealerFilters, DealerLookupOptions } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FilterProps {
  filters: DealerFilters;
  options: DealerLookupOptions;
  onApply: (next: Partial<DealerFilters>) => void;
  onAddDealer?: () => void;
}

function FilterCombobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[] | { value: string | number; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isObj = options.length > 0 && typeof options[0] === "object";
  const selectedVal = value && String(value).trim() !== "" ? String(value) : "";

  let displayLabel = placeholder;
  if (selectedVal) {
    if (isObj) {
      const found = (
        options as { value: string | number; label: string }[]
      ).find((o) => String(o.value) === selectedVal);
      displayLabel = found ? found.label : selectedVal;
    } else {
      displayLabel = selectedVal;
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-11 rounded-xl shadow-sm border-border/60 w-40 justify-between font-bold text-xs uppercase tracking-widest bg-background"
        >
          <span className="truncate">
            {selectedVal ? displayLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0 shadow-lg rounded-xl border-border/60"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder}...`}
            className="h-9 text-xs"
          />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No matches found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-bold uppercase text-muted-foreground cursor-pointer"
              >
                All {placeholder}s
              </CommandItem>
              {options.map((opt, index) => {
                const optVal = isObj
                  ? String((opt as { value: string | number }).value)
                  : (opt as string);
                const optLabel = isObj
                  ? (opt as { label: string }).label
                  : (opt as string);
                return (
                  <CommandItem
                    key={`${optVal}-${index}`}
                    value={optLabel}
                    onSelect={() => {
                      onChange(optVal);
                      setOpen(false);
                    }}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <Check
                      className={cn(
                        " h-4 w-4 text-primary",
                        selectedVal === optVal ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {optLabel}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DealerListFilter = React.memo(function DealerListFilter({
  filters,
  options,
  onApply,
  onAddDealer,
}: FilterProps) {
  const [localSearch, setLocalSearch] = useState(filters.search ?? "");

  interface PSGCItem {
    code: string;
    name: string;
    provinceCode?: string;
  }

  // PSGC Lists and Loading States
  const [provincesList, setProvincesList] = useState<PSGCItem[]>([]);
  const [allCitiesList, setAllCitiesList] = useState<PSGCItem[]>([]);
  const [citiesList, setCitiesList] = useState<PSGCItem[]>([]);
  const [barangaysList, setBarangaysList] = useState<
    { code: string; name: string }[]
  >([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingAllCities, setIsLoadingAllCities] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);

  const PSGC = "https://psgc.gitlab.io/api";

  // Fetch provinces and all cities on mount
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      setIsLoadingProvinces(true);
      setIsLoadingAllCities(true);
      try {
        const [provRes, cityRes] = await Promise.all([
          fetch(`${PSGC}/provinces/`),
          fetch(`${PSGC}/cities-municipalities/`),
        ]);

        if (provRes.ok) {
          const provData: PSGCItem[] = await provRes.json();
          if (isMounted) {
            setProvincesList(
              provData
                .map((p) => ({ code: p.code, name: p.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
        }

        if (cityRes.ok) {
          const cityData: PSGCItem[] = await cityRes.json();
          if (isMounted) {
            setAllCitiesList(
              cityData
                .map((c) => ({
                  code: c.code,
                  name: c.name,
                  provinceCode: c.provinceCode,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
        }
      } catch (err) {
        console.error("Could not load initial PSGC lists", err);
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
          setIsLoadingAllCities(false);
        }
      }
    };
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch/compute cities based on selected province
  const selectedProvince = filters.dealer_province ?? "";
  useEffect(() => {
    if (!selectedProvince) {
      // No province selected -> show all cities
      setCitiesList(allCitiesList);
      return;
    }

    const provObj = provincesList.find((p) => p.name === selectedProvince);
    if (!provObj) {
      setCitiesList([]);
      return;
    }

    let isMounted = true;
    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        const res = await fetch(
          `${PSGC}/provinces/${provObj.code}/cities-municipalities/`,
        );
        if (!res.ok) throw new Error("Failed to fetch cities");
        const data: PSGCItem[] = await res.json();
        if (isMounted) {
          setCitiesList(
            data
              .map((c) => ({
                code: c.code,
                name: c.name,
                provinceCode: c.provinceCode,
              }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch (err) {
        console.error("Could not load cities for province", err);
      } finally {
        if (isMounted) setIsLoadingCities(false);
      }
    };
    fetchCities();
    return () => {
      isMounted = false;
    };
  }, [selectedProvince, provincesList, allCitiesList]);

  // Fetch barangays when selected city changes
  const selectedCity = filters.dealer_city ?? "";
  useEffect(() => {
    if (!selectedCity) {
      setBarangaysList([]);
      return;
    }
    const cityObj = citiesList.find((c) => c.name === selectedCity);
    if (!cityObj) return;

    let isMounted = true;
    const fetchBarangays = async () => {
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
      } catch (err) {
        console.error("Could not load barangays", err);
      } finally {
        if (isMounted) setIsLoadingBarangays(false);
      }
    };
    fetchBarangays();
    return () => {
      isMounted = false;
    };
  }, [selectedCity, citiesList]);

  const commitSearch = () => {
    onApply({ search: localSearch });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
    if (e.key === "Escape") {
      setLocalSearch("");
      onApply({ search: "" });
    }
  };

  const handleFilterChange = (field: keyof DealerFilters) => (val: string) => {
    onApply({ [field]: val });
  };

  const handleProvinceChange = (val: string) => {
    onApply({
      dealer_province: val,
      dealer_city: "",
      dealer_brgy: "",
    });
  };

  const handleCityChange = (val: string) => {
    // If no province is selected, try to auto-detect and set it!
    if (!filters.dealer_province) {
      const cityObj = allCitiesList.find((c) => c.name === val);
      if (cityObj && cityObj.provinceCode) {
        const provObj = provincesList.find(
          (p) => p.code === cityObj.provinceCode,
        );
        if (provObj) {
          onApply({
            dealer_province: provObj.name,
            dealer_city: val,
            dealer_brgy: "",
          });
          return;
        }
      }
    }

    onApply({
      dealer_city: val,
      dealer_brgy: "",
    });
  };

  const handleBrgyChange = (val: string) => {
    onApply({
      dealer_brgy: val,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="relative w-full xl:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dealers..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onBlur={commitSearch}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 h-11 rounded-xl bg-background shadow-sm border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <FilterCombobox
            value={String(filters.dealer_type_id ?? "")}
            onChange={handleFilterChange("dealer_type_id")}
            options={options.types.map((t) => ({
              value: t.dealer_type_id,
              label: t.type_name,
            }))}
            placeholder="Type"
          />
          <FilterCombobox
            value={filters.dealer_province ?? ""}
            onChange={handleProvinceChange}
            options={provincesList.map((p) => p.name)}
            placeholder={
              isLoadingProvinces ? "Loading Provinces..." : "Province"
            }
            disabled={isLoadingProvinces}
          />
          <FilterCombobox
            value={filters.dealer_city ?? ""}
            onChange={handleCityChange}
            options={citiesList.map((c) => c.name)}
            placeholder={
              isLoadingCities || isLoadingAllCities
                ? "Loading Cities..."
                : "City"
            }
            disabled={
              isLoadingCities ||
              (isLoadingAllCities && !filters.dealer_province)
            }
          />
          <FilterCombobox
            value={filters.dealer_brgy ?? ""}
            onChange={handleBrgyChange}
            options={barangaysList.map((b) => b.name)}
            placeholder={
              !filters.dealer_city
                ? "Select City"
                : isLoadingBarangays
                  ? "Loading Barangays..."
                  : "Barangay"
            }
            disabled={!filters.dealer_city || isLoadingBarangays}
          />
          <FilterCombobox
            value={filters.dealer_department ?? ""}
            onChange={handleFilterChange("dealer_department")}
            options={options.departments}
            placeholder="Department"
            disabled={options.departments.length === 0}
          />
          {/* <FilterCombobox
            value={String(filters.subscription_id ?? "")}
            onChange={handleFilterChange("subscription_id")}
            options={options.tiers.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
            placeholder="Tier"
            disabled={options.tiers.length === 0}
          /> */}
          {onAddDealer && (
            <Button
              onClick={onAddDealer}
              className="h-11 rounded-xl shadow-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest px-6 ml-auto xl:ml-2"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Dealer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export default DealerListFilter;
