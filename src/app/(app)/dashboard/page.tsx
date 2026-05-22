import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Camera,
  Layers,
  Plus,
  Shirt,
  Sparkles,
} from "lucide-react";

import { BudgetCard } from "@/components/budget-card";
import { ClothingCard } from "@/components/clothing-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBudgetStatus } from "@/lib/budget";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { key: "clothing", label: "Kledingstukken", icon: Shirt, href: "/closet" },
  { key: "outfits", label: "Outfits", icon: Layers, href: "/outfits" },
  {
    key: "reference",
    label: "Referentiefoto's",
    icon: Camera,
    href: "/reference-photos",
  },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();

  const [clothingCount, outfitCount, referenceCount, recent, primary, budget] =
    await Promise.all([
      prisma.clothingItem.count({ where: { userId: user.id } }),
      prisma.outfit.count({ where: { userId: user.id } }),
      prisma.referencePhoto.count({ where: { userId: user.id } }),
      prisma.clothingItem.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          mainCategory: true,
          subCategory: true,
          colors: true,
          imagePath: true,
        },
      }),
      prisma.referencePhoto.findFirst({
        where: { userId: user.id, isPrimary: true },
        select: { id: true },
      }),
      getBudgetStatus(user.id),
    ]);

  const counts: Record<string, number> = {
    clothing: clothingCount,
    outfits: outfitCount,
    reference: referenceCount,
  };

  const firstName = user.name?.split(" ")[0] ?? "stylist";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hoi ${firstName}`}
        description="Welkom terug bij je digitale kledingkast."
        action={
          <Button asChild>
            <Link href="/closet/new">
              <Plus className="h-4 w-4" />
              Kledingstuk toevoegen
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.key} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">
                      {counts[stat.key]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent toegevoegd</CardTitle>
              {recent.length > 0 && (
                <Link
                  href="/closet"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Alles bekijken
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <EmptyState
                  icon={Shirt}
                  title="Je kledingkast is nog leeg"
                  description="Upload je eerste kledingstuk en laat AI helpen met het herkennen ervan."
                  action={
                    <Button asChild>
                      <Link href="/closet/new">
                        <Plus className="h-4 w-4" />
                        Eerste kledingstuk
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {recent.map((item) => (
                    <ClothingCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <BudgetCard status={budget} compact />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Snel aan de slag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/advice">Vraag stijladvies</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/outfits/new">Stel een outfit samen</Link>
              </Button>
              {!primary && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link href="/reference-photos">
                    Voeg een referentiefoto toe
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
