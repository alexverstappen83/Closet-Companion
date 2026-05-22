"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { deleteImage, ownerOfImagePath } from "@/lib/storage";

const metadataSchema = z.object({
  name: z.string().trim().min(1, "Geef het kledingstuk een naam.").max(120),
  mainCategory: z.string().trim().min(1, "Kies een hoofdcategorie."),
  subCategory: z.string().trim().max(80).optional().nullable(),
  colors: z.array(z.string().trim().min(1)).max(20).default([]),
  pattern: z.string().trim().max(80).optional().nullable(),
  seasons: z.array(z.string().trim().min(1)).max(8).default([]),
  formality: z.string().trim().max(80).optional().nullable(),
  styleTags: z.array(z.string().trim().min(1)).max(30).default([]),
  occasions: z.array(z.string().trim().min(1)).max(30).default([]),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createSchema = metadataSchema.extend({
  imagePath: z.string().trim().min(1),
  mimeType: z.string().trim().optional(),
  originalName: z.string().trim().optional(),
  aiStatus: z.string().trim().optional(),
});

export type ClothingMetadataInput = z.infer<typeof metadataSchema>;
export type CreateClothingInput = z.infer<typeof createSchema> & {
  aiRawResponse?: unknown;
};

function clean<T>(value: T | null | undefined): T | null {
  return value === undefined || value === null || value === "" ? null : value;
}

export async function createClothingItem(
  input: CreateClothingInput,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const data = parsed.data;
  // De afbeelding moet eerder door deze gebruiker zijn geüpload (sectie 5.1 / 8).
  if (!data.imagePath.startsWith("clothing/") || ownerOfImagePath(data.imagePath) !== user.id) {
    return { ok: false, error: "De afbeelding hoort niet bij jouw account." };
  }

  const item = await prisma.clothingItem.create({
    data: {
      userId: user.id,
      name: data.name,
      mainCategory: data.mainCategory,
      subCategory: clean(data.subCategory),
      colors: data.colors,
      pattern: clean(data.pattern),
      seasons: data.seasons,
      formality: clean(data.formality),
      styleTags: data.styleTags,
      occasions: data.occasions,
      notes: clean(data.notes),
      imagePath: data.imagePath,
      mimeType: clean(data.mimeType),
      originalName: clean(data.originalName),
      aiStatus: clean(data.aiStatus),
      aiRawResponse:
        input.aiRawResponse === undefined
          ? Prisma.JsonNull
          : (input.aiRawResponse as Prisma.InputJsonValue),
    },
  });

  revalidatePath("/closet");
  revalidatePath("/dashboard");
  return { ok: true, id: item.id };
}

export async function updateClothingItem(
  id: string,
  input: ClothingMetadataInput,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = metadataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return { ok: false, error: "Kledingstuk niet gevonden." };
  }

  const data = parsed.data;
  await prisma.clothingItem.update({
    where: { id },
    data: {
      name: data.name,
      mainCategory: data.mainCategory,
      subCategory: clean(data.subCategory),
      colors: data.colors,
      pattern: clean(data.pattern),
      seasons: data.seasons,
      formality: clean(data.formality),
      styleTags: data.styleTags,
      occasions: data.occasions,
      notes: clean(data.notes),
    },
  });

  revalidatePath("/closet");
  revalidatePath(`/closet/${id}`);
  return { ok: true, id };
}

export async function deleteClothingItem(id: string): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const existing = await prisma.clothingItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return { ok: false, error: "Kledingstuk niet gevonden." };
  }

  await prisma.clothingItem.delete({ where: { id } });
  await deleteImage(existing.imagePath);

  revalidatePath("/closet");
  revalidatePath("/dashboard");
  return { ok: true };
}
