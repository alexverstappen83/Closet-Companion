import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/guards";

import { AddClothingFlow } from "./add-clothing-flow";

export const metadata: Metadata = { title: "Kledingstuk toevoegen" };

export default async function NewClothingPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kledingstuk toevoegen"
        description="Upload een foto en laat AI de gegevens voorstellen — jij houdt de controle."
      />

      <div className="mx-auto max-w-xl rounded-xl border bg-secondary/40 p-4 text-sm">
        <p className="mb-2 font-medium">Meerdere kledingstukken op één foto?</p>
        <p className="mb-3 text-muted-foreground">
          Upload één foto van een complete outfit en laat AI alle kledingstukken
          afzonderlijk herkennen en toevoegen.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/closet/new/outfit">
            <ImagePlus className="h-4 w-4" />
            Outfit-foto importeren
          </Link>
        </Button>
      </div>

      <AddClothingFlow />
    </div>
  );
}
