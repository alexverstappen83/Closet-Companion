import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { Plus, Search, Shirt } from "lucide-react";

import { ClothingCard } from "@/components/clothing-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MAIN_CATEGORIES } from "@/lib/constants";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mijn kledingkast" };

function buildHref(q: string, category: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/closet?${query}` : "/closet";
}

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = (params.category ?? "").trim();

  const where: Prisma.ClothingItemWhereInput = { userId: user.id };
  if (category && MAIN_CATEGORIES.includes(category as never)) {
    where.mainCategory = category;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { subCategory: { contains: q, mode: "insensitive" } },
      { styleTags: { has: q } },
      { colors: { has: q } },
    ];
  }

  const items = await prisma.clothingItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mainCategory: true,
      subCategory: true,
      colors: true,
      imagePath: true,
    },
  });

  const isFiltered = Boolean(q || category);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mijn kledingkast"
        description="Al je kledingstukken op één plek, gecategoriseerd en doorzoekbaar."
        action={
          <Button asChild>
            <Link href="/closet/new">
              <Plus className="h-4 w-4" />
              Kledingstuk toevoegen
            </Link>
          </Button>
        }
      />

      <div className="space-y-3">
        <form action="/closet" className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Zoek op naam, kleur of stijl…"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {category && (
            <input type="hidden" name="category" value={category} />
          )}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref(q, "")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              !category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            Alles
          </Link>
          {MAIN_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildHref(q, cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title={isFiltered ? "Geen kledingstukken gevonden" : "Nog geen kleding"}
          description={
            isFiltered
              ? "Pas je zoekopdracht of filter aan om meer te zien."
              : "Voeg je eerste kledingstuk toe en laat AI helpen met het herkennen ervan."
          }
          action={
            isFiltered ? (
              <Button asChild variant="outline">
                <Link href="/closet">Filters wissen</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/closet/new">
                  <Plus className="h-4 w-4" />
                  Kledingstuk toevoegen
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {items.length}{" "}
            {items.length === 1 ? "kledingstuk" : "kledingstukken"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ClothingCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
