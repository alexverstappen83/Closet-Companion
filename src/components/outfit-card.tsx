import Link from "next/link";
import { Heart, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { imageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export interface OutfitCardData {
  id: string;
  name: string;
  occasion: string | null;
  isFavorite: boolean;
  items: { id: string; name: string; imagePath: string }[];
}

export function OutfitCard({ outfit }: { outfit: OutfitCardData }) {
  const preview = outfit.items.slice(0, 4);

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="grid grid-cols-4 gap-px bg-border">
        {preview.map((item) => (
          <div key={item.id} className="aspect-square bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(item.imagePath)}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - preview.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="flex aspect-square items-center justify-center bg-secondary text-muted-foreground"
          >
            <Layers className="h-4 w-4 opacity-40" />
          </div>
        ))}
      </div>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{outfit.name}</p>
          {outfit.occasion && (
            <Badge variant="secondary" className="mt-1">
              {outfit.occasion}
            </Badge>
          )}
        </div>
        <Heart
          className={cn(
            "h-4 w-4 shrink-0",
            outfit.isFavorite
              ? "fill-destructive text-destructive"
              : "text-muted-foreground",
          )}
        />
      </div>
    </Link>
  );
}
