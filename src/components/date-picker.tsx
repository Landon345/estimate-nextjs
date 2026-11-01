"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** yyyy-mm-dd → that calendar day at local midnight, which is what the calendar works in. */
function fromYmd(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

const toYmd = (date: Date) => format(date, "yyyy-MM-dd");

/**
 * Only mounts while the popover is open, so reading the current year here never
 * happens during prerendering (Next flags `new Date()` in a static shell).
 */
function PickerCalendar(props: {
  selected: Date | undefined;
  defaultMonth: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled: Matcher[];
}) {
  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      startMonth={new Date(1900, 0)}
      endMonth={new Date(new Date().getFullYear() + 10, 11)}
      autoFocus
      {...props}
    />
  );
}

/**
 * shadcn date picker (Radix Popover + Calendar) that works as a form field:
 * it posts `name=yyyy-mm-dd` exactly like `<input type="date">` did, so the
 * server actions and GET filters read it unchanged. `min`/`max` are yyyy-mm-dd.
 */
export function DatePicker({
  id,
  name,
  defaultValue = "",
  required = false,
  min,
  max,
  placeholder = "Pick a date",
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  // Follow a new default (e.g. a filter cleared by navigation) without remounting.
  const [lastDefault, setLastDefault] = useState(defaultValue);
  if (defaultValue !== lastDefault) {
    setLastDefault(defaultValue);
    setValue(defaultValue);
  }

  const selected = fromYmd(value);
  const disabled: Matcher[] = [];
  const minDate = min ? fromYmd(min) : undefined;
  const maxDate = max ? fromYmd(max) : undefined;
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  const choose = (date: Date | undefined) => {
    setValue(date ? toYmd(date) : "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            data-empty={!selected}
            className="flex h-10 w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-left text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 data-[empty=true]:text-muted"
          >
            <CalendarIcon className="size-4 shrink-0 text-muted" aria-hidden />
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </button>
        </PopoverTrigger>
        {/* Carries the value in the form. Not readOnly, so the browser still enforces `required`
            and points its message at the picker. */}
        <input
          name={name}
          value={value}
          onChange={() => {}}
          required={required}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
          onFocus={() => setOpen(true)}
        />
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <PickerCalendar selected={selected} defaultMonth={selected ?? minDate ?? maxDate} onSelect={choose} disabled={disabled} />
        {!required && selected && (
          <div className="border-t border-line px-3 py-2 text-right">
            <button type="button" onClick={() => choose(undefined)} className="text-sm font-medium text-brand hover:underline">
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
