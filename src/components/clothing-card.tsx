import Link from "next/link";
import { Shirt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { imageUrl } from "@/lib/image-url";

export interface ClothingCardData {
  id: string;
  name: string;
  mainCategory: string;
  subCategory: string | null;
  colors: string[];
  imagePath: string;
}

export function ClothingCard({ item }: { item: ClothingCardData }) {
  return (
    <Link
      href={`/closet/${item.id}`}
      className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(item.imagePath)}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1.5 p-3">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="gap-1">
            <Shirt className="h-3 w-3" />
            {item.subCategory ?? item.mainCategory}
          </Badge>
          {item.colors[0] && (
            <Badge variant="outline">{item.colors[0]}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
