"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { ChipMultiSelect } from "@/components/chip-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOutfit } from "@/lib/actions/outfits";
import { OCCASION_SUGGESTIONS, STYLE_TAGS } from "@/lib/constants";
import { imageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

interface PickerItem {
  id: string;
  name: string;
  mainCategory: string;
  subCategory: string | null;
  imagePath: string;
}

export function OutfitBuilder({ items }: { items: PickerItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [description, setDescription] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedItems = useMemo(
    () => items.filter((item) => selected.includes(item.id)),
    [items, selected],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Geef de outfit een naam.");
      return;
    }
    if (selected.length === 0) {
      setError("Kies minimaal één kledingstuk.");
      return;
    }
    startTransition(async () => {
      const result = await createOutfit({
        name,
        occasion: occasion || null,
        description: description || null,
        styleTags,
        itemIds: selected,
      });
      if (result.ok && result.id) {
        router.push(`/outfits/${result.id}`);
        router.refresh();
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Kies kledingstukken ({selected.length} geselecteerd)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {items.map((item) => {
              const active = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border-2 transition-colors",
                    active ? "border-primary" : "border-transparent",
                  )}
                >
                  <div className="aspect-square bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(item.imagePath)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="block truncate px-1.5 py-1 text-left text-[11px] font-medium">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outfitgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Bijv. Zomerse terraslook"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occasion">Gelegenheid</Label>
              <Input
                id="occasion"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                list="occasion-suggestions"
                placeholder="Bijv. warme zomeravond"
              />
              <datalist id="occasion-suggestions">
                {OCCASION_SUGGESTIONS.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Stijl-tags</Label>
              <ChipMultiSelect
                options={STYLE_TAGS}
                value={styleTags}
                onChange={setStyleTags}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optionele notitie over deze outfit."
              />
            </div>

            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedItems.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            )}

            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Outfit opslaan
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
