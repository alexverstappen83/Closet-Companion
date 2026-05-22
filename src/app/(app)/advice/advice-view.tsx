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

interface AdviceResponse {
  advice: { outfitName: string; advice: string; recommendedItemIds: string[] };
  recommendedItems: RecommendedItem[];
}

export function AdviceView() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdviceResponse | null>(null);
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function requestAdvice(event: React.FormEvent) {
    event.preventDefault();
    if (!occasion.trim()) {
      setError("Beschrijf voor welke gelegenheid je advies wilt.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
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
      setResult(data as AdviceResponse);
    } catch {
      setError("Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  function saveAsOutfit() {
    if (!result) return;
    setSaveError(null);
    startSave(async () => {
      const created = await createOutfit({
        name: result.advice.outfitName,
        occasion: occasion || null,
        description: result.advice.advice,
        styleTags: [],
        itemIds: result.recommendedItems.map((item) => item.id),
      });
      if (created.ok && created.id) {
        router.push(`/outfits/${created.id}`);
        router.refresh();
      } else if (!created.ok) {
        setSaveError(created.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waar gaat het naartoe?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={requestAdvice} className="space-y-4">
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

            <AiNotice>
              De gegevens van je kledingkast worden naar OpenAI gestuurd om
              advies te maken. Dit verbruikt een klein deel van je AI-tegoed.
            </AiNotice>

            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Vraag stijladvies
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advies</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Vul een gelegenheid in en ontvang een outfitadvies op basis van je
              eigen kledingkast.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {result.advice.outfitName}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {result.advice.advice}
                </p>
              </div>

              {result.recommendedItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {result.recommendedItems.map((item) => (
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
              )}

              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}

              {result.recommendedItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveAsOutfit}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                  Bewaar als outfit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
