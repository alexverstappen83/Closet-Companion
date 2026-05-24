"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  ClothingMetadataForm,
  type ClothingMetadata,
} from "@/components/clothing-metadata-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  deleteClothingItem,
  replaceClothingImage,
  updateClothingItem,
} from "@/lib/actions/clothing";
import { imageUrl } from "@/lib/image-url";

function buildSearchQuery(
  name: string,
  brand: string | null,
  colors: string[],
): string {
  const parts: string[] = [];
  if (brand) parts.push(brand);
  if (name) parts.push(name);
  if (colors.length) parts.push(colors.slice(0, 2).join(" "));
  return parts.join(" ").trim();
}

export function EditClothingView({
  id,
  imagePath,
  initial,
  brand,
  name,
  colors,
}: {
  id: string;
  imagePath: string;
  initial: ClothingMetadata;
  brand: string | null;
  name: string;
  colors: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [replacing, startReplace] = useTransition();
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceMessage, setReplaceMessage] = useState<string | null>(null);

  const query = buildSearchQuery(name, brand, colors);
  const shoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    query,
  )}`;

  async function handleUpdate(values: ClothingMetadata) {
    const result = await updateClothingItem(id, values);
    if (result.ok) {
      router.push("/closet");
      router.refresh();
    }
    return result;
  }

  function handleDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteClothingItem(id);
      if (result.ok) {
        router.push("/closet");
        router.refresh();
      } else {
        setDeleteError(result.error);
      }
    });
  }

  function handleFileChosen(file: File | null) {
    if (!file) return;
    setReplaceError(null);
    setReplaceMessage(null);
    startReplace(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await replaceClothingImage(id, formData);
      if (result.ok) {
        setReplaceMessage("Nieuwe foto opgeslagen.");
        router.refresh();
      } else {
        setReplaceError(result.error);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(imagePath)}
            alt={initial.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) =>
            handleFileChosen(event.target.files?.[0] ?? null)
          }
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={replacing}
        >
          {replacing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Foto vervangen
        </Button>

        {query && (
          <ImagePickerDialog
            id={id}
            query={query}
            onApplied={(newUrl) => {
              setReplaceMessage("Nieuwe foto opgeslagen.");
              setReplaceError(null);
              router.refresh();
              return newUrl;
            }}
          />
        )}
        {query && (
          <Button asChild type="button" variant="outline" className="w-full">
            <a href={shoppingUrl} target="_blank" rel="noreferrer">
              <ShoppingBag className="h-4 w-4" />
              Koop opnieuw
            </a>
          </Button>
        )}

        {!query && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            Vul een naam en (optioneel) merk in om zoekknoppen te gebruiken.
          </p>
        )}

        {replaceMessage && (
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            {replaceMessage}
          </p>
        )}
        {replaceError && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <ImageIcon className="mt-0.5 h-3 w-3 shrink-0" />
            {replaceError}
          </p>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full text-destructive">
              <Trash2 className="h-4 w-4" />
              Kledingstuk verwijderen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kledingstuk verwijderen?</DialogTitle>
              <DialogDescription>
                Dit verwijdert het kledingstuk en de bijbehorende foto
                definitief. Deze actie kan niet ongedaan worden gemaakt.
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
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Verwijderen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ClothingMetadataForm
            initial={initial}
            submitLabel="Wijzigingen opslaan"
            cancelHref="/closet"
            onSubmit={handleUpdate}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface GoogleResult {
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string;
  contextUrl: string | null;
  width: number | null;
  height: number | null;
}

function ImagePickerDialog({
  id,
  query: initialQuery,
  onApplied,
}: {
  id: string;
  query: string;
  onApplied: (newUrl: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "ai">("search");

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GoogleResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchConfigured, setSearchConfigured] = useState(true);
  const [applyingUrl, setApplyingUrl] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Eerste zoekopdracht zodra de dialog opent in zoek-modus.
  useEffect(() => {
    if (!open || mode !== "search" || results !== null) return;
    void runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  async function runSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchError("Geef een zoekopdracht op.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `/api/clothing/${id}/search-images?q=${encodeURIComponent(trimmed)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        setSearchConfigured(data.configured !== false);
        setSearchError(data.error ?? "Zoeken is mislukt.");
        setResults([]);
        return;
      }
      setSearchConfigured(true);
      setResults((data.results ?? []) as GoogleResult[]);
    } catch {
      setSearchError("Er ging iets mis tijdens het zoeken.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function applyUrl(url: string) {
    setApplyingUrl(url);
    setSearchError(null);
    try {
      const response = await fetch(`/api/clothing/${id}/set-image-from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSearchError(data.error ?? "Toepassen is mislukt.");
        return;
      }
      onApplied(data.imageUrl);
      setOpen(false);
    } catch {
      setSearchError("Er ging iets mis bij het toepassen van de foto.");
    } finally {
      setApplyingUrl(null);
    }
  }

  async function generateAi() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const response = await fetch(`/api/clothing/${id}/generate-photo`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setGenerateError(data.error ?? "AI-generatie is mislukt.");
        return;
      }
      onApplied(data.imageUrl);
      setOpen(false);
    } catch {
      setGenerateError("Er ging iets mis bij het genereren.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Search className="h-4 w-4" />
          Zoek een betere foto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Foto vervangen</DialogTitle>
          <DialogDescription>
            Zoek op Google of laat AI een schone productfoto maken — beide
            vervangen direct de huidige foto.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex rounded-lg border bg-secondary p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${
              mode === "search"
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMode("search")}
          >
            <Search className="mr-1.5 inline h-4 w-4" />
            Google zoeken
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${
              mode === "ai"
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMode("ai")}
          >
            <Sparkles className="mr-1.5 inline h-4 w-4" />
            AI productfoto
          </button>
        </div>

        {mode === "search" && (
          <div className="space-y-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch(query);
              }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoektermen…"
              />
              <Button type="submit" disabled={searching || !query.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Zoeken
              </Button>
            </form>

            {!searchConfigured && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                In-app zoeken is nog niet geconfigureerd. Stel{" "}
                <code className="rounded bg-amber-100 px-1">
                  GOOGLE_CSE_API_KEY
                </code>{" "}
                en{" "}
                <code className="rounded bg-amber-100 px-1">GOOGLE_CSE_ID</code>{" "}
                in als env-variabelen op de server.
              </p>
            )}

            {searchError && searchConfigured && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {searchError}
              </p>
            )}

            <div className="max-h-[60vh] overflow-y-auto">
              {searching && !results ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </p>
              ) : results && results.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Geen resultaten.
                </p>
              ) : results ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {results.map((result) => {
                    const thumb = result.thumbnailUrl ?? result.imageUrl;
                    const busy = applyingUrl === result.imageUrl;
                    return (
                      <button
                        key={result.imageUrl}
                        type="button"
                        onClick={() => applyUrl(result.imageUrl)}
                        disabled={Boolean(applyingUrl)}
                        className="group relative overflow-hidden rounded-lg border bg-secondary text-left transition-shadow hover:shadow-md disabled:opacity-60"
                        title={result.title}
                      >
                        <div className="aspect-square bg-secondary">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumb}
                            alt={result.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {busy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {mode === "ai" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              AI maakt een schone studio-foto van dit kledingstuk op basis van
              de huidige naam, merk, kleur en notities. Kost ongeveer $0.20 uit
              je AI-tegoed en vervangt direct de huidige foto.
            </p>
            <div className="rounded-lg border bg-secondary/50 p-3 text-xs">
              <p className="font-medium">Zoekopdracht die wordt gebruikt:</p>
              <p className="mt-1 text-muted-foreground">{query}</p>
            </div>
            {generateError && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {generateError}
              </p>
            )}
            <Button
              type="button"
              onClick={generateAi}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "AI maakt foto…" : "Maak AI-productfoto"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuleren</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
