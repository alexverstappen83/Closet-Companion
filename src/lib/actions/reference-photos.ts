"use server";

import { revalidatePath } from "next/cache";

import { AiTaskType, AiUsageStatus } from "@prisma/client";

import type { ActionResult } from "@/lib/action-result";
import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import { describeReferencePose, ESTIMATED_COST } from "@/lib/openai";
import { normalizeForOpenAi } from "@/lib/image-prep";
import { prisma } from "@/lib/prisma";
import { deleteImage, readImage, saveUpload, UploadError } from "@/lib/storage";

/** Best-effort pose-extractie. Faalt stil: we willen nooit dat de upload
 *  blokkeert omdat de AI-call mis ging of budget op is. Foutmeldingen worden
 *  alleen in de logs gezet. */
async function extractPoseDescription(
  userId: string,
  photoId: string,
  imagePath: string,
): Promise<void> {
  if (!isOpenAiConfigured()) return;
  try {
    await assertWithinBudget(userId, ESTIMATED_COST.recognition);
  } catch (error) {
    if (error instanceof BudgetError) {
      await logAiUsage({
        userId,
        taskType: AiTaskType.CLOTHING_RECOGNITION,
        model: config.openai.visionModel,
        status: AiUsageStatus.BLOCKED_BY_BUDGET,
        estimatedCostUsd: ESTIMATED_COST.recognition,
        finalCostUsd: 0,
        errorMessage: error.message,
      });
      return;
    }
    throw error;
  }

  try {
    const { buffer } = await readImage(imagePath, userId);
    const normalized = await normalizeForOpenAi(buffer, { maxDimension: 768 });
    const { description, usage } = await describeReferencePose(
      normalized.buffer.toString("base64"),
      normalized.mimeType,
    );
    if (description) {
      await prisma.referencePhoto.update({
        where: { id: photoId },
        data: { poseDescription: description },
      });
    }
    await logAiUsage({
      userId,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: usage.model,
      status: AiUsageStatus.COMPLETED,
      estimatedCostUsd: ESTIMATED_COST.recognition,
      finalCostUsd: usage.costUsd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (error) {
    console.error("[reference-photos] pose extraction failed", error);
    await logAiUsage({
      userId,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: config.openai.visionModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.recognition,
      finalCostUsd: 0,
      errorMessage:
        error instanceof Error ? error.message : "Onbekende fout.",
    });
  }
}

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
  const photo = await prisma.referencePhoto.create({
    data: {
      userId: user.id,
      imagePath: saved.imagePath,
      mimeType: saved.mimeType,
      originalName: saved.originalName,
      isPrimary: count === 0,
    },
  });

  await extractPoseDescription(user.id, photo.id, saved.imagePath);

  revalidatePath("/reference-photos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function analyzeReferencePhotoPose(
  id: string,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const photo = await prisma.referencePhoto.findUnique({ where: { id } });
  if (!photo || photo.userId !== user.id) {
    return { ok: false, error: "Referentiefoto niet gevonden." };
  }

  await extractPoseDescription(user.id, photo.id, photo.imagePath);
  revalidatePath("/reference-photos");
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
