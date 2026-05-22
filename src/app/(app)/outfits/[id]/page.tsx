import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import { OutfitDetailView } from "./outfit-detail-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outfit" };

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const outfit = await prisma.outfit.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          clothingItem: {
            select: {
              id: true,
              name: true,
              mainCategory: true,
              imagePath: true,
            },
          },
        },
      },
      generatedImages: {
        orderBy: { createdAt: "desc" },
        select: { id: true, imagePath: true, createdAt: true },
      },
    },
  });

  if (!outfit || outfit.userId !== user.id) {
    notFound();
  }

  const primary = await prisma.referencePhoto.findFirst({
    where: { userId: user.id, isPrimary: true },
    select: { id: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={outfit.name}
        description={outfit.occasion ?? "Outfit uit jouw kledingkast"}
      />
      <OutfitDetailView
        id={outfit.id}
        description={outfit.description}
        styleTags={outfit.styleTags}
        isFavorite={outfit.isFavorite}
        hasPrimaryReference={Boolean(primary)}
        items={outfit.items.map((entry) => entry.clothingItem)}
        generated={outfit.generatedImages.map((image) => ({
          id: image.id,
          imagePath: image.imagePath,
          createdAt: image.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
