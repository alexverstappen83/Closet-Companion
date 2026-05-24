import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { ClothingMetadata } from "@/components/clothing-metadata-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import { EditClothingView } from "./edit-clothing-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kledingstuk bewerken" };

export default async function ClothingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    notFound();
  }

  const initial: ClothingMetadata = {
    name: item.name,
    brand: item.brand ?? "",
    mainCategory: item.mainCategory,
    subCategory: item.subCategory ?? "",
    colors: item.colors,
    pattern: item.pattern ?? "",
    seasons: item.seasons,
    formality: item.formality ?? "",
    styleTags: item.styleTags,
    occasions: item.occasions,
    notes: item.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        description={`Toegevoegd op ${formatDate(item.createdAt)}`}
      />
      <EditClothingView
        id={item.id}
        imagePath={item.imagePath}
        initial={initial}
        brand={item.brand}
        name={item.name}
        colors={item.colors}
      />
    </div>
  );
}
