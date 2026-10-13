"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, MAX_COUNTRIES, EU_LOCATION_CODE, getCountry } from "@/lib/locations";

type CountrySelectProps = {
  value: string[];
  onChange: (codes: string[]) => void;
};

export default function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(code: string) {
    if (code === EU_LOCATION_CODE) {
      // "All EU + UK" already covers a whole region; selecting it replaces
      // any other picked countries, and deselecting it just clears.
      onChange(value.includes(EU_LOCATION_CODE) ? [] : [EU_LOCATION_CODE]);
      return;
    }
    if (value.includes(EU_LOCATION_CODE)) {
      onChange([code]);
      return;
    }
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < MAX_COUNTRIES) {
      onChange([...value, code]);
    }
  }

  const euSelected = value.includes(EU_LOCATION_CODE);
  const atMax = value.length >= MAX_COUNTRIES;
  const label =
    value.length > 0
      ? value.map((code) => getCountry(code)?.label).filter(Boolean).join(", ")
      : "Select countries";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-[180px] items-center justify-between rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-left text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className={value.length === 0 ? "text-gray-400" : ""}>{label}</span>
        <span className="ml-2 text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {atMax && !euSelected && (
            <p className="px-2 pb-2 text-xs text-gray-500">Max {MAX_COUNTRIES} countries</p>
          )}
          {COUNTRIES.map((country) => {
            const checked = value.includes(country.code);
            const disabled =
              !checked && (euSelected || (!country.isRegion && atMax));
            return (
              <label
                key={country.code}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  country.isRegion ? "mb-1 border-b border-gray-100 pb-2 font-medium" : ""
                } ${
                  disabled ? "cursor-not-allowed text-gray-300" : "cursor-pointer text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(country.code)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {country.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
