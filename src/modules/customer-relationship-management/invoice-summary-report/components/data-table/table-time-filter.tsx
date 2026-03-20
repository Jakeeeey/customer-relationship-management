"use client";

import * as React from "react";
import { Column } from "@tanstack/react-table";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface DataTableTimeFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
}

export function DataTableTimeFilter<TData, TValue>({
  column,
  title,
}: DataTableTimeFilterProps<TData, TValue>) {
  const rawValue = column?.getFilterValue();
  const isNumericRange =
    Array.isArray(rawValue) && typeof rawValue[0] === "number";

  const filterValue = isNumericRange ? (rawValue as [number, number]) : [0, 24];
  const [values, setValues] = React.useState<number[]>(filterValue);

  React.useEffect(() => {
    if (isNumericRange) setValues(rawValue as number[]);
  }, [rawValue, isNumericRange]);

  const handleSliderChange = (newValues: number[]) => {
    setValues(newValues);
    column?.setFilterValue(newValues);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed gap-2">
          <Clock className="h-4 w-4" />
          {title}
          {isNumericRange && (values[0] !== 0 || values[1] !== 24) && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="text-xs font-mono text-primary">
                {typeof values[0] === "number"
                  ? `${values[0]}h - ${values[1]}h`
                  : "0h - 24h"}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-70 p-4" align="start">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{title}</h4>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                value={values[0]}
                onChange={(e) =>
                  handleSliderChange([parseInt(e.target.value) || 0, values[1]])
                }
                className="h-9"
              />
            </div>
            <div className="relative flex-1">
              <Input
                type="number"
                value={values[1]}
                onChange={(e) =>
                  handleSliderChange([values[0], parseInt(e.target.value) || 0])
                }
                className="h-9"
              />
            </div>
          </div>

          <Slider
            min={0}
            max={24}
            step={1}
            value={values}
            onValueChange={handleSliderChange}
          />

          <Button
            variant="secondary"
            className="w-full text-xs font-bold uppercase"
            onClick={() => {
              setValues([0, 24]);
              column?.setFilterValue(undefined);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
