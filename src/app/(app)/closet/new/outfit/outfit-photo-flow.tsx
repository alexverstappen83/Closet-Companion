"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
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

interface DetectedItem {
  imagePath: string;
  imageUrl: string;
  mimeType: string;
  originalName: string;
  suggestion: Suggestion;
}

interface RecognitionResponse {
  sourceImagePath: string;
  sourceImageUrl: string;
  items: DetectedItem[];
  message?: string;
}

interface ReviewRow {
  key: string;
  imageUrl: string;
  imagePath: string;
  mimeType: string;
  originalName: string;
  metadata: ClothingMetadata;
  status: "pending" | "saving" | "saved" | "error";
  error?: string;
}

function toMetadata(suggestion: Suggestion): ClothingMetadata {
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

export function OutfitPhotoFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  function pickFile(selected: File | null) {
    setError(null);
    setFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  async function analyze() {
    if (!file) {
      setError("Kies eerst een foto.");
      return;
    }
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/clothing/recognize-outfit", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as RecognitionResponse & {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Herkennen is mislukt.");
        return;
      }
      setSourceImageUrl(data.sourceImageUrl);
      if (!data.items.length) {
        setError(
          data.message ??
            "Er zijn geen kledingstukken herkend op deze foto. Probeer een andere foto.",
        );
        return;
      }
      setRows(
        data.items.map((item, index) => ({
          key: `${index}-${item.imagePath}`,
          imageUrl: item.imageUrl,
          imagePath: item.imagePath,
          mimeType: item.mimeType,
          originalName: item.originalName,
          metadata: toMetadata(item.suggestion),
          status: "pending",
        })),
      );
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  function updateRow(key: string, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current ? current.map((row) => (row.key === key ? { ...row, ...patch } : row)) : current,
    );
  }

  function removeRow(key: string) {
    setRows((current) => (current ? current.filter((row) => row.key !== key) : current));
  }

  async function saveRow(key: string, values: ClothingMetadata) {
    updateRow(key, { metadata: values, status: "saving", error: undefined });
    const row = rows?.find((entry) => entry.key === key);
    if (!row) return { ok: false, error: "Item niet gevonden." };
    const result = await createClothingItem({
      ...values,
      imagePath: row.imagePath,
      mimeType: row.mimeType,
      originalName: row.originalName,
      aiStatus: "completed",
    });
    if (result.ok) {
      updateRow(key, { status: "saved" });
    } else {
      updateRow(key, { status: "error", error: result.error });
    }
    return result;
  }

  async function saveAllRemaining() {
    if (!rows) return;
    setBulkBusy(true);
    for (const row of rows) {
      if (row.status === "saved" || row.status === "saving") continue;
      await saveRow(row.key, row.metadata);
    }
    setBulkBusy(false);
    router.refresh();
  }

  async function finishFlow() {
    router.push("/closet");
    router.refresh();
  }

  if (rows) {
    const savedCount = rows.filter((row) => row.status === "saved").length;
    const pendingCount = rows.filter((row) => row.status !== "saved").length;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            {sourceImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourceImageUrl}
                alt="Outfit-foto"
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div className="text-sm">
              <p className="font-medium">{rows.length} kledingstuk(ken) herkend</p>
              <p className="text-muted-foreground">
                {savedCount} opgeslagen · {pendingCount} nog te bevestigen
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={finishFlow}
              disabled={bulkBusy}
            >
              Naar kledingkast
            </Button>
            {pendingCount > 0 && (
              <Button
                type="button"
                onClick={saveAllRemaining}
                disabled={bulkBusy}
              >
                {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Alles opslaan ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.key} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <CardTitle className="text-base">
                  {row.metadata.name || "Naamloos kledingstuk"}
                </CardTitle>
                {row.status === "saved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Opgeslagen
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeRow(row.key)}
                    disabled={row.status === "saving"}
                  >
                    <Trash2 className="h-4 w-4" />
                    Overslaan
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-lg border bg-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.imageUrl}
                        alt={row.metadata.name || "Gedetecteerd item"}
                        className="aspect-square w-full object-cover"
                      />
                    </div>
                    {row.error && (
                      <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        {row.error}
                      </p>
                    )}
                  </div>
                  <div>
                    {row.status === "saved" ? (
                      <p className="text-sm text-muted-foreground">
                        Dit kledingstuk staat nu in je kledingkast.
                      </p>
                    ) : (
                      <ClothingMetadataForm
                        initial={row.metadata}
                        submitLabel={
                          row.status === "saving"
                            ? "Bezig…"
                            : "Opslaan in kledingkast"
                        }
                        cancelHref="/closet"
                        onSubmit={(values) => saveRow(row.key, values)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Foto van een volledige outfit</CardTitle>
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
              className="max-h-72 rounded-lg object-contain"
            />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Klik om een outfit-foto te kiezen</p>
              <p className="text-xs text-muted-foreground">
                Het beste resultaat met één persoon, van top tot teen, goed
                belicht en een rustige achtergrond.
              </p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />

        <AiNotice>
          De foto wordt opgeslagen op je eigen server. Voor herkenning wordt de
          foto naar OpenAI gestuurd. Per kledingstuk wordt automatisch een
          uitsnede gemaakt; je controleert en bewerkt alles voordat het in je
          kast komt.
        </AiNotice>

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!file || busy}
          onClick={analyze}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {busy ? "AI bekijkt de foto…" : "Uploaden en herkennen"}
        </Button>
      </CardContent>
    </Card>
  );
}
