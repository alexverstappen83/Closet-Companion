import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/guards";

import { OutfitPhotoFlow } from "./outfit-photo-flow";

export const metadata: Metadata = { title: "Outfit-foto importeren" };

export default async function NewOutfitPhotoPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outfit-foto importeren"
        description="Eén foto, alle kledingstukken er in één keer uit — AI herkent ze, jij controleert."
      />
      <OutfitPhotoFlow />
    </div>
  );
}
