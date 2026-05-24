"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Bookmark, Loader2, Sparkles } from "lucide-react";

import { AiNotice } from "@/components/ai-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOutfit } from "@/lib/actions/outfits";
import { OCCASION_SUGGESTIONS } from "@/lib/constants";
import { imageUrl } from "@/lib/image-url";

interface RecommendedItem {
  id: string;
  name: string;
  mainCategory: string;
  imagePath: string;
}

interface AdviceOption {
  advice: {
    outfitName: string;
    advice: string;
    recommendedItemIds: string[];
  };
  recommendedItems: RecommendedItem[];
}

interface AdviceResponse {
  options: AdviceOption[];
}

export function AdviceView() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AdviceOption[] | null>(null);
  const [saving, startSave] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function requestAdvice(event: React.FormEvent) {
    event.preventDefault();
    if (!occasion.trim()) {
      setError("Beschrijf voor welke gelegenheid je advies wilt.");
      return;
    }
    setLoading(true);
    setError(null);
    setOptions(null);
    setSaveError(null);
    try {
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, preferences: preferences || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Het ophalen van advies is mislukt.");
        return;
      }
      const parsed = data as AdviceResponse;
      setOptions(parsed.options ?? []);
    } catch {
      setError("Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  function saveAsOutfit(option: AdviceOption, index: number) {
    setSaveError(null);
    setSavingIndex(index);
    startSave(async () => {
      const created = await createOutfit({
        name: option.advice.outfitName,
        occasion: occasion || null,
        description: option.advice.advice,
        styleTags: [],
        itemIds: option.recommendedItems.map((item) => item.id),
      });
      setSavingIndex(null);
      if (created.ok && created.id) {
        router.push(`/outfits/${created.id}`);
        router.refresh();
      } else if (!created.ok) {
        setSaveError(created.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waar gaat het naartoe?</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={requestAdvice}
            className="grid gap-4 md:grid-cols-2 md:items-start"
          >
            <div className="space-y-2">
              <Label htmlFor="occasion">Gelegenheid</Label>
              <Input
                id="occasion"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                list="advice-occasions"
                placeholder="Bijv. warme zomeravond"
                required
              />
              <datalist id="advice-occasions">
                {OCCASION_SUGGESTIONS.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences">Persoonlijke voorkeuren</Label>
              <Textarea
                id="preferences"
                value={preferences}
                onChange={(event) => setPreferences(event.target.value)}
                placeholder="Bijv. ik draag graag rustige kleuren en smart casual."
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <AiNotice>
                De gegevens van je kledingkast worden naar OpenAI gestuurd om
                drie verschillende outfit-opties te maken. Dit verbruikt een
                klein deel van je AI-tegoed.
              </AiNotice>

              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Vraag drie outfit-adviezen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!options && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Vul een gelegenheid in en ontvang drie verschillende outfitadviezen
            op basis van je eigen kledingkast.
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            De stylist denkt na…
          </CardContent>
        </Card>
      )}

      {options && options.length > 0 && (
        <>
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            {options.map((option, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <CardTitle className="text-base leading-tight">
                      {option.advice.outfitName}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {option.advice.advice}
                  </p>

                  {option.recommendedItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {option.recommendedItems.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-lg border bg-card"
                        >
                          <div className="aspect-square bg-secondary">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl(item.imagePath)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="truncate px-2 py-1.5 text-xs font-medium">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      Geen passende kledingstukken gevonden voor deze optie.
                    </p>
                  )}

                  <div className="mt-auto">
                    {option.recommendedItems.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => saveAsOutfit(option, index)}
                        disabled={saving}
                      >
                        {saving && savingIndex === index ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                        Bewaar als outfit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {options && options.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            De AI gaf geen bruikbare opties terug. Probeer het opnieuw, eventueel
            met een andere omschrijving van de gelegenheid.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
