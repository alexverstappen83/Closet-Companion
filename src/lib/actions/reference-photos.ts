"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { deleteImage, saveUpload, UploadError } from "@/lib/storage";

export async function uploadReferencePhoto(
  formData: FormData,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Geen bestand ontvangen." };
  }

  let saved;
  try {
    saved = await saveUpload("reference", user.id, file);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof UploadError ? error.message : "Upload mislukt.",
    };
  }

  // De eerste referentiefoto wordt automatisch de primaire foto (sectie 7.2).
  const count = await prisma.referencePhoto.count({ where: { userId: user.id } });
  await prisma.referencePhoto.create({
    data: {
      userId: user.id,
      imagePath: saved.imagePath,
      mimeType: saved.mimeType,
      originalName: saved.originalName,
      isPrimary: count === 0,
    },
  });

  revalidatePath("/reference-photos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setPrimaryReferencePhoto(
  id: string,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const photo = await prisma.referencePhoto.findUnique({ where: { id } });
  if (!photo || photo.userId !== user.id) {
    return { ok: false, error: "Referentiefoto niet gevonden." };
  }

  // Maximaal één actieve primaire referentiefoto per gebruiker (sectie 7).
  await prisma.$transaction([
    prisma.referencePhoto.updateMany({
      where: { userId: user.id, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.referencePhoto.update({
      where: { id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath("/reference-photos");
  return { ok: true };
}

export async function deleteReferencePhoto(id: string): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const photo = await prisma.referencePhoto.findUnique({ where: { id } });
  if (!photo || photo.userId !== user.id) {
    return { ok: false, error: "Referentiefoto niet gevonden." };
  }

  await prisma.referencePhoto.delete({ where: { id } });
  await deleteImage(photo.imagePath);

  // Als de primaire foto verdwijnt, promoveer een andere foto.
  if (photo.isPrimary) {
    const next = await prisma.referencePhoto.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.referencePhoto.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath("/reference-photos");
  revalidatePath("/dashboard");
  return { ok: true };
}
