"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  Heart,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { AiNotice } from "@/components/ai-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BACKGROUND_PRESETS } from "@/lib/constants";
import { deleteOutfit, toggleOutfitFavorite } from "@/lib/actions/outfits";
import { imageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

interface OutfitItem {
  id: string;
  name: string;
  mainCategory: string;
  imagePath: string;
}

interface GeneratedImage {
  id: string;
  imagePath: string;
  createdAt: string;
}

export function OutfitDetailView({
  id,
  description,
  styleTags,
  isFavorite,
  items,
  hasPrimaryReference,
  generated,
}: {
  id: string;
  description: string | null;
  styleTags: string[];
  isFavorite: boolean;
  items: OutfitItem[];
  hasPrimaryReference: boolean;
  generated: GeneratedImage[];
}) {
  const router = useRouter();
  const [favPending, startFav] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [previews, setPreviews] = useState<GeneratedImage[]>(generated);
  const [visualizing, setVisualizing] = useState(false);
  const [visualizeError, setVisualizeError] = useState<string | null>(null);
  const [background, setBackground] = useState<string>("auto");

  function handleFavorite() {
    startFav(async () => {
      await toggleOutfitFavorite(id);
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteOutfit(id);
      if (result.ok) {
        router.push("/outfits");
        router.refresh();
      } else {
        setDeleteError(result.error);
      }
    });
  }

  async function visualize() {
    setVisualizing(true);
    setVisualizeError(null);
    try {
      const response = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitId: id, background }),
      });
      const data = await response.json();
      if (!response.ok) {
        setVisualizeError(data.error ?? "Visualisatie is mislukt.");
        return;
      }
      setPreviews((current) => [
        { id: data.generatedId, imagePath: stripUrl(data.imageUrl), createdAt: new Date().toISOString() },
        ...current,
      ]);
      router.refresh();
    } catch {
      setVisualizeError("Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setVisualizing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kledingstukken ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/closet/${item.id}`}
                  className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
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
                </Link>
              ))}
            </div>
            {description && (
              <p className="mt-4 text-sm text-muted-foreground">{description}</p>
            )}
            {styleTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {styleTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-visualisaties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Er zijn nog geen visualisaties van deze outfit.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((image) => (
                  <a
                    key={image.id}
                    href={imageUrl(image.imagePath)}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border bg-secondary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(image.imagePath)}
                      alt="Gegenereerde outfitvisualisatie"
                      className="aspect-[2/3] w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visualiseer op mij</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AiNotice>
              Je primaire referentiefoto en de kledinggegevens worden naar
              OpenAI gestuurd om een visualisatie te maken. Het resultaat wordt
              op je eigen server opgeslagen en verbruikt AI-tegoed.
            </AiNotice>

            {!hasPrimaryReference ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Stel eerst een primaire referentiefoto in.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="background">Achtergrond</Label>
              <Select
                id="background"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                disabled={visualizing}
              >
                {BACKGROUND_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </div>

            {visualizeError && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {visualizeError}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={visualize}
              disabled={visualizing || !hasPrimaryReference}
            >
              {visualizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {visualizing ? "Bezig met genereren…" : "Maak AI-preview"}
            </Button>
            {!hasPrimaryReference && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/reference-photos">Naar referentiefoto's</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleFavorite}
              disabled={favPending}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorite && "fill-destructive text-destructive",
                )}
              />
              {isFavorite ? "Uit favorieten" : "Markeer als favoriet"}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Outfit verwijderen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Outfit verwijderen?</DialogTitle>
                  <DialogDescription>
                    De outfit wordt verwijderd. Je kledingstukken zelf blijven
                    in je kledingkast.
                  </DialogDescription>
                </DialogHeader>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuleren</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deletePending}
                  >
                    {deletePending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Verwijderen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function stripUrl(url: string): string {
  return url.replace(/^\/api\/uploads\//, "");
}
