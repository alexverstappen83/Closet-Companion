import Link from "next/link";
import type { Metadata } from "next";
import { Shirt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import { AdviceView } from "./advice-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stijladvies" };

export default async function AdvicePage() {
  const user = await requireUser();
  const clothingCount = await prisma.clothingItem.count({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stijladvies"
        description="Laat AI een passende outfit samenstellen uit jouw kledingkast."
      />
      {clothingCount === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Je kledingkast is nog leeg"
          description="Voeg eerst kledingstukken toe, dan kan AI er advies over geven."
          action={
            <Button asChild>
              <Link href="/closet/new">Kledingstuk toevoegen</Link>
            </Button>
          }
        />
      ) : (
        <AdviceView />
      )}
    </div>
  );
}
