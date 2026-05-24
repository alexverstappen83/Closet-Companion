import type { NextRequest } from "next/server";
import { AiTaskType, AiUsageStatus } from "@prisma/client";

import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import { imageUrl } from "@/lib/image-url";
import {
  ESTIMATED_COST,
  generateProductPhoto,
  OpenAiNotConfiguredError,
} from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { deleteImage, saveBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return Response.json(
      { error: "AI-fotogeneratie is niet beschikbaar." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    return Response.json({ error: "Kledingstuk niet gevonden." }, { status: 404 });
  }

  try {
    await assertWithinBudget(user.id, ESTIMATED_COST.visualization);
  } catch (error) {
    if (error instanceof BudgetError) {
      await logAiUsage({
        userId: user.id,
        taskType: AiTaskType.OUTFIT_IMAGE_GENERATION,
        model: config.openai.imageModel,
        status: AiUsageStatus.BLOCKED_BY_BUDGET,
        estimatedCostUsd: ESTIMATED_COST.visualization,
        finalCostUsd: 0,
        errorMessage: error.message,
        relatedClothingId: item.id,
      });
      return Response.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  try {
    const { image, usage } = await generateProductPhoto({
      name: item.name,
      brand: item.brand,
      mainCategory: item.mainCategory,
      subCategory: item.subCategory,
      colors: item.colors,
      pattern: item.pattern,
      notes: item.notes,
    });

    const oldImagePath = item.imagePath;
    const newImagePath = await saveBuffer("clothing", user.id, image, "png");
    await prisma.clothingItem.update({
      where: { id },
      data: {
        imagePath: newImagePath,
        mimeType: "image/png",
        originalName: `${item.name.slice(0, 60)}-ai.png`,
      },
    });
    await deleteImage(oldImagePath);

    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.OUTFIT_IMAGE_GENERATION,
      model: usage.model,
      status: AiUsageStatus.COMPLETED,
      estimatedCostUsd: ESTIMATED_COST.visualization,
      finalCostUsd: usage.costUsd,
      imageCount: 1,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      relatedClothingId: item.id,
    });

    return Response.json({ ok: true, imageUrl: imageUrl(newImagePath) });
  } catch (error) {
    console.error("[generate-photo] failed", error);
    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.OUTFIT_IMAGE_GENERATION,
      model: config.openai.imageModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.visualization,
      finalCostUsd: 0,
      errorMessage: error instanceof Error ? error.message : "Onbekende fout.",
      relatedClothingId: item.id,
    });
    const message =
      error instanceof OpenAiNotConfiguredError
        ? error.message
        : "Het genereren van een productfoto is mislukt.";
    return Response.json({ error: message }, { status: 502 });
  }
}
