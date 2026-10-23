"use client";

import { CaretDown } from "@phosphor-icons/react";

type Option = { value: string; label: string };

/**
 * A status pill that opens the native dropdown. A plain <select> is as wide as its longest
 * option; this one fits the current label, with the real select laid invisibly on top.
 */
export function PillSelect({
  value,
  options,
  onChange,
  tone,
  dot,
  ariaLabel,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  tone: string;
  dot?: string;
  ariaLabel: string;
}) {
  const current = options.find((o) => o.value === value) || options[0];
  return (
    <span className={`relative inline-flex items-center gap-1.5 rounded-full border pl-2.5 pr-2 py-0.5 text-[11px] font-medium whitespace-nowrap focus-within:ring-1 focus-within:ring-white/30 ${tone}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {current?.label}
      <CaretDown size={10} weight="bold" className="opacity-60" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#141418] text-zinc-200">
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
