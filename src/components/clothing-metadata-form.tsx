"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { ChipMultiSelect } from "@/components/chip-multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FORMALITY_LEVELS,
  MAIN_CATEGORIES,
  OCCASION_SUGGESTIONS,
  PATTERNS,
  SEASONS,
  STYLE_TAGS,
  SUB_CATEGORIES,
} from "@/lib/constants";

export interface ClothingMetadata {
  name: string;
  mainCategory: string;
  subCategory: string;
  colors: string[];
  pattern: string;
  seasons: string[];
  formality: string;
  styleTags: string[];
  occasions: string[];
  notes: string;
}

export const emptyMetadata: ClothingMetadata = {
  name: "",
  mainCategory: "bovenkleding",
  subCategory: "",
  colors: [],
  pattern: "",
  seasons: [],
  formality: "",
  styleTags: [],
  occasions: [],
  notes: "",
};

interface ClothingMetadataFormProps {
  initial: ClothingMetadata;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (values: ClothingMetadata) => Promise<{ ok: boolean; error?: string }>;
}

export function ClothingMetadataForm({
  initial,
  submitLabel,
  cancelHref,
  onSubmit,
}: ClothingMetadataFormProps) {
  const [values, setValues] = useState<ClothingMetadata>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ClothingMetadata>(
    key: K,
    value: ClothingMetadata[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Geef het kledingstuk een naam.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        setError(result.error ?? "Er ging iets mis.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Naam</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Bijv. Lichtblauw linnen overhemd"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mainCategory">Hoofdcategorie</Label>
          <Select
            id="mainCategory"
            value={values.mainCategory}
            onChange={(event) => update("mainCategory", event.target.value)}
          >
            {MAIN_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subCategory">Subcategorie</Label>
          <Select
            id="subCategory"
            value={values.subCategory}
            onChange={(event) => update("subCategory", event.target.value)}
          >
            <option value="">— Geen —</option>
            {SUB_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pattern">Patroon</Label>
          <Select
            id="pattern"
            value={values.pattern}
            onChange={(event) => update("pattern", event.target.value)}
          >
            <option value="">— Geen —</option>
            {PATTERNS.map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="formality">Formaliteit</Label>
          <Select
            id="formality"
            value={values.formality}
            onChange={(event) => update("formality", event.target.value)}
          >
            <option value="">— Geen —</option>
            {FORMALITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Kleuren</Label>
        <ChipMultiSelect
          value={values.colors}
          onChange={(next) => update("colors", next)}
          allowCustom
          placeholder="Kleur toevoegen…"
        />
      </div>

      <div className="space-y-2">
        <Label>Seizoenen</Label>
        <ChipMultiSelect
          options={SEASONS}
          value={values.seasons}
          onChange={(next) => update("seasons", next)}
        />
      </div>

      <div className="space-y-2">
        <Label>Stijl-tags</Label>
        <ChipMultiSelect
          options={STYLE_TAGS}
          value={values.styleTags}
          onChange={(next) => update("styleTags", next)}
          allowCustom
          placeholder="Eigen stijl-tag…"
        />
      </div>

      <div className="space-y-2">
        <Label>Gelegenheden</Label>
        <ChipMultiSelect
          options={OCCASION_SUGGESTIONS}
          value={values.occasions}
          onChange={(next) => update("occasions", next)}
          allowCustom
          placeholder="Gelegenheid toevoegen…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notities</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Optionele persoonlijke notities over dit kledingstuk."
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>Annuleren</Link>
        </Button>
      </div>
    </form>
  );
}
