import Link from "next/link";
import type { Metadata } from "next";
import { Shirt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import { OutfitBuilder } from "./outfit-builder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outfit maken" };

export default async function NewOutfitPage() {
  const user = await requireUser();

  const items = await prisma.clothingItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mainCategory: true,
      subCategory: true,
      imagePath: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outfit maken"
        description="Selecteer kledingstukken en stel ze samen tot een complete look."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Eerst kleding nodig"
          description="Voeg kledingstukken toe aan je kledingkast voordat je een outfit samenstelt."
          action={
            <Button asChild>
              <Link href="/closet/new">Kledingstuk toevoegen</Link>
            </Button>
          }
        />
      ) : (
        <OutfitBuilder items={items} />
      )}
    </div>
  );
}
