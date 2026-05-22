import Link from "next/link";
import type { Metadata } from "next";
import { Layers, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { OutfitCard } from "@/components/outfit-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outfits" };

export default async function OutfitsPage() {
  const user = await requireUser();

  const outfits = await prisma.outfit.findMany({
    where: { userId: user.id },
    orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          clothingItem: {
            select: { id: true, name: true, imagePath: true },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outfits"
        description="Combineer kledingstukken uit je kledingkast tot complete looks."
        action={
          <Button asChild>
            <Link href="/outfits/new">
              <Plus className="h-4 w-4" />
              Outfit maken
            </Link>
          </Button>
        }
      />

      {outfits.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nog geen outfits"
          description="Stel je eerste outfit samen uit de kledingstukken in je kledingkast."
          action={
            <Button asChild>
              <Link href="/outfits/new">
                <Plus className="h-4 w-4" />
                Outfit maken
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={{
                id: outfit.id,
                name: outfit.name,
                occasion: outfit.occasion,
                isFavorite: outfit.isFavorite,
                items: outfit.items.map((entry) => entry.clothingItem),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
