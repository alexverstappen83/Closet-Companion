"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
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
  const imagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    query,
  )}`;
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
          <Button asChild type="button" variant="outline" className="w-full">
            <a href={imagesUrl} target="_blank" rel="noreferrer">
              <Search className="h-4 w-4" />
              Zoek productfoto's
            </a>
          </Button>
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
