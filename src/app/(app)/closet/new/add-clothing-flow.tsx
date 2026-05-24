"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

import { AiNotice } from "@/components/ai-notice";
import {
  ClothingMetadataForm,
  emptyMetadata,
  type ClothingMetadata,
} from "@/components/clothing-metadata-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClothingItem } from "@/lib/actions/clothing";
import { MAIN_CATEGORIES } from "@/lib/constants";

interface Suggestion {
  name: string;
  brand: string | null;
  mainCategory: string;
  subCategory: string | null;
  colors: string[];
  pattern: string | null;
  seasons: string[];
  formality: string | null;
  styleTags: string[];
  occasions: string[];
  description: string | null;
}

interface RecognitionResult {
  imagePath: string;
  mimeType: string;
  originalName: string;
  aiStatus: "completed" | "blocked" | "unavailable" | "failed" | "skipped";
  message?: string;
  suggestion?: Suggestion;
  raw?: unknown;
}

function toMetadata(suggestion?: Suggestion): ClothingMetadata {
  if (!suggestion) return emptyMetadata;
  return {
    name: suggestion.name ?? "",
    brand: suggestion.brand ?? "",
    mainCategory: MAIN_CATEGORIES.includes(suggestion.mainCategory as never)
      ? suggestion.mainCategory
      : "bovenkleding",
    subCategory: suggestion.subCategory ?? "",
    colors: suggestion.colors ?? [],
    pattern: suggestion.pattern ?? "",
    seasons: suggestion.seasons ?? [],
    formality: suggestion.formality ?? "",
    styleTags: suggestion.styleTags ?? [],
    occasions: suggestion.occasions ?? [],
    notes: suggestion.description ?? "",
  };
}

export function AddClothingFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(selected: File | null) {
    setError(null);
    setFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  async function analyze(skipAi: boolean) {
    if (!file) {
      setError("Kies eerst een foto.");
      return;
    }
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (skipAi) formData.append("skipAi", "1");

    try {
      const response = await fetch("/api/clothing/recognize", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Uploaden is mislukt.");
        return;
      }
      setResult(data as RecognitionResult);
    } catch {
      setError("Er ging iets mis bij het uploaden. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(values: ClothingMetadata) {
    if (!result) return { ok: false, error: "Geen afbeelding beschikbaar." };
    const response = await createClothingItem({
      ...values,
      imagePath: result.imagePath,
      mimeType: result.mimeType,
      originalName: result.originalName,
      aiStatus: result.aiStatus,
      aiRawResponse: result.raw,
    });
    if (response.ok) {
      router.push("/closet");
      router.refresh();
    }
    return response;
  }

  if (result) {
    const aiOk = result.aiStatus === "completed";
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-secondary">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Voorbeeld"
                className="aspect-square w-full object-cover"
              />
            )}
          </div>
          {aiOk ? (
            <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              AI heeft suggesties ingevuld. Controleer en pas ze gerust aan.
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {result.message ?? "Vul de gegevens handmatig in."}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gegevens controleren</CardTitle>
          </CardHeader>
          <CardContent>
            <ClothingMetadataForm
              initial={toMetadata(result.suggestion)}
              submitLabel="Opslaan in kledingkast"
              cancelHref="/closet"
              onSubmit={handleSave}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Foto van het kledingstuk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-secondary/40 px-6 py-10 text-center transition-colors hover:bg-secondary"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Voorbeeld"
              className="max-h-56 rounded-lg object-contain"
            />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Klik om een foto te kiezen</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG of WEBP — bij voorkeur één kledingstuk op een rustige
                achtergrond.
              </p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        <AiNotice>
          De foto wordt opgeslagen op je eigen server. Voor AI-herkenning wordt
          de foto naar OpenAI gestuurd. Dit verbruikt een klein deel van je
          maandelijkse AI-tegoed.
        </AiNotice>

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            disabled={!file || busy}
            onClick={() => analyze(false)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Uploaden &amp; herkennen met AI
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!file || busy}
            onClick={() => analyze(true)}
          >
            Overslaan, zelf invullen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
