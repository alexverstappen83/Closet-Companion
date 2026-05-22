"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ChipMultiSelectProps {
  options?: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  placeholder?: string;
}

export function ChipMultiSelect({
  options = [],
  value,
  onChange,
  allowCustom = false,
  placeholder = "Eigen waarde toevoegen…",
}: ChipMultiSelectProps) {
  const [draft, setDraft] = useState("");

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((entry) => entry !== option));
    } else {
      onChange([...value, option]);
    }
  }

  function addCustom() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  const extras = value.filter((entry) => !options.includes(entry));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {option}
            </button>
          );
        })}
        {extras.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => toggle(entry)}
            className="flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
          >
            {entry}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder={placeholder}
            className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Toevoegen
          </button>
        </div>
      )}
    </div>
  );
}
