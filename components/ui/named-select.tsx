"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface NSOption {
  value: string;
  label: string;
}

interface Props {
  options: NSOption[];
  value?: string | null;
  onValueChange?: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Select that always renders the selected label explicitly.
 * @base-ui/react's SelectValue shows the raw value string (UUID) when the
 * popup is closed because it can't look up labels from unmounted item nodes.
 * This component bypasses that by doing an explicit options.find() lookup.
 */
export function NamedSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar…",
  disabled,
  className,
}: Props) {
  const label = value ? (options.find((o) => o.value === value)?.label ?? null) : null;

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onValueChange?.(v || null)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <span>{label ?? placeholder}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
