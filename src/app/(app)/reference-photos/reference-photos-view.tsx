"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import { AiNotice } from "@/components/ai-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteReferencePhoto,
  setPrimaryReferencePhoto,
  uploadReferencePhoto,
} from "@/lib/actions/reference-photos";
import { imageUrl } from "@/lib/image-url";

interface ReferencePhoto {
  id: string;
  imagePath: string;
  isPrimary: boolean;
}

export function ReferencePhotosView({
  photos,
}: {
  photos: ReferencePhoto[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function pickFile(selected: File | null) {
    setError(null);
    setFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return selected ? URL.createObjectURL(selected) : null;
    });
  }

  function handleUpload() {
    if (!file) {
      setError("Kies eerst een foto.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startUpload(async () => {
      const result = await uploadReferencePhoto(formData);
      if (result.ok) {
        pickFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  async function makePrimary(id: string) {
    setBusyId(id);
    await setPrimaryReferencePhoto(id);
    setBusyId(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    await deleteReferencePhoto(id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto uploaden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-secondary/40 px-4 py-8 text-center transition-colors hover:bg-secondary"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Voorbeeld"
                  className="max-h-52 rounded-lg object-contain"
                />
              ) : (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Kies een foto</p>
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
              Referentiefoto's blijven op je eigen server staan. Ze worden
              alleen naar OpenAI gestuurd wanneer je een outfit op jezelf
              visualiseert.
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
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Foto toevoegen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tips voor een goede foto</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[
                "Sta volledig in beeld, van top tot teen",
                "Schoenen en hoofd zijn zichtbaar",
                "Draag strak passende kleding zodat de AI je lichaamsvorm en verhoudingen goed kan inschatten",
                "Upload meerdere foto's (bijv. voor- en zijaanzicht); de AI gebruikt ze allemaal",
                "Goed belicht en een rustige achtergrond",
                "Bij voorkeur maar één persoon op de foto",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        {photos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Je hebt nog geen referentiefoto's. Upload je eerste foto links.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="relative aspect-[3/4] bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(photo.imagePath)}
                    alt="Referentiefoto"
                    className="h-full w-full object-cover"
                  />
                  {photo.isPrimary && (
                    <Badge className="absolute left-2 top-2 gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Primair
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5 p-2.5">
                  {!photo.isPrimary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => makePrimary(photo.id)}
                      disabled={busyId === photo.id}
                    >
                      {busyId === photo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                      Maak primair
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive"
                    onClick={() => remove(photo.id)}
                    disabled={busyId === photo.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    Verwijderen
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
