"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const outfitSchema = z.object({
  name: z.string().trim().min(1, "Geef de outfit een naam.").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  occasion: z.string().trim().max(120).optional().nullable(),
  styleTags: z.array(z.string().trim().min(1)).max(30).default([]),
  itemIds: z
    .array(z.string().trim().min(1))
    .min(1, "Kies minimaal één kledingstuk."),
});

export type CreateOutfitInput = z.infer<typeof outfitSchema>;

export async function createOutfit(
  input: CreateOutfitInput,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = outfitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const data = parsed.data;
  const uniqueIds = [...new Set(data.itemIds)];

  // Alle kledingstukken moeten van de ingelogde gebruiker zijn (data-isolatie).
  const ownedCount = await prisma.clothingItem.count({
    where: { id: { in: uniqueIds }, userId: user.id },
  });
  if (ownedCount !== uniqueIds.length) {
    return { ok: false, error: "Eén of meer kledingstukken zijn niet beschikbaar." };
  }

  const outfit = await prisma.outfit.create({
    data: {
      userId: user.id,
      name: data.name,
      description: data.description || null,
      occasion: data.occasion || null,
      styleTags: data.styleTags,
      items: {
        create: uniqueIds.map((clothingItemId, index) => ({
          clothingItemId,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/outfits");
  revalidatePath("/dashboard");
  return { ok: true, id: outfit.id };
}

export async function toggleOutfitFavorite(id: string): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const outfit = await prisma.outfit.findUnique({ where: { id } });
  if (!outfit || outfit.userId !== user.id) {
    return { ok: false, error: "Outfit niet gevonden." };
  }

  await prisma.outfit.update({
    where: { id },
    data: { isFavorite: !outfit.isFavorite },
  });

  revalidatePath("/outfits");
  revalidatePath(`/outfits/${id}`);
  return { ok: true };
}

export async function deleteOutfit(id: string): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const outfit = await prisma.outfit.findUnique({ where: { id } });
  if (!outfit || outfit.userId !== user.id) {
    return { ok: false, error: "Outfit niet gevonden." };
  }

  await prisma.outfit.delete({ where: { id } });

  revalidatePath("/outfits");
  revalidatePath("/dashboard");
  return { ok: true };
}
