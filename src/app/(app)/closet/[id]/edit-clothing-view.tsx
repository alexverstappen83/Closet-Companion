"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
import { deleteClothingItem, updateClothingItem } from "@/lib/actions/clothing";
import { imageUrl } from "@/lib/image-url";

export function EditClothingView({
  id,
  imagePath,
  initial,
}: {
  id: string;
  imagePath: string;
  initial: ClothingMetadata;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
