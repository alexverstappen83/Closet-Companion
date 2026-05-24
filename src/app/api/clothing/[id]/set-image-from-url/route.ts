import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiUser } from "@/lib/guards";
import { fetchExternalImage, ImageFetchError } from "@/lib/image-fetcher";
import { normalizeForOpenAi } from "@/lib/image-prep";
import { prisma } from "@/lib/prisma";
import { deleteImage, saveBuffer } from "@/lib/storage";
import { imageUrl } from "@/lib/image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().trim().url("Geef een geldige URL op."),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  const { id } = await context.params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    return Response.json({ error: "Kledingstuk niet gevonden." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." },
      { status: 400 },
    );
  }

  let fetched;
  try {
    fetched = await fetchExternalImage(parsed.data.url);
  } catch (error) {
    if (error instanceof ImageFetchError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[set-image-from-url] fetch failed", error);
    return Response.json(
      { error: "Kon de afbeelding niet ophalen." },
      { status: 502 },
    );
  }

  // Normaliseer naar JPEG/sRGB met fatsoenlijke maximale afmeting — werkt
  // ook als de remote server een rare encoding leverde.
  const normalized = await normalizeForOpenAi(fetched.buffer, {
    maxDimension: 1280,
  });

  const oldImagePath = item.imagePath;
  const newImagePath = await saveBuffer(
    "clothing",
    user.id,
    normalized.buffer,
    "jpg",
  );

  await prisma.clothingItem.update({
    where: { id },
    data: {
      imagePath: newImagePath,
      mimeType: normalized.mimeType,
      originalName: fetched.originalName,
    },
  });

  await deleteImage(oldImagePath);

  return Response.json({
    ok: true,
    imageUrl: imageUrl(newImagePath),
  });
}
