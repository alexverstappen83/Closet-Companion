import type { NextRequest } from "next/server";
import { AiTaskType, AiUsageStatus } from "@prisma/client";

import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import { cropFromImage, normalizeForOpenAi } from "@/lib/image-prep";
import { imageUrl } from "@/lib/image-url";
import {
  ESTIMATED_COST,
  OpenAiNotConfiguredError,
  recognizeOutfitPhoto,
} from "@/lib/openai";
import { readImage, saveBuffer, saveUpload, UploadError } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return Response.json(
      {
        error:
          "AI-herkenning is niet beschikbaar. Voeg kledingstukken handmatig toe.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Geen bestand ontvangen." }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveUpload("clothing", user.id, file);
  } catch (error) {
    const message =
      error instanceof UploadError ? error.message : "Upload mislukt.";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    await assertWithinBudget(user.id, ESTIMATED_COST.outfitRecognition);
  } catch (error) {
    if (error instanceof BudgetError) {
      await logAiUsage({
        userId: user.id,
        taskType: AiTaskType.CLOTHING_RECOGNITION,
        model: config.openai.visionModel,
        status: AiUsageStatus.BLOCKED_BY_BUDGET,
        estimatedCostUsd: ESTIMATED_COST.outfitRecognition,
        finalCostUsd: 0,
        errorMessage: error.message,
      });
      return Response.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  try {
    const { buffer: originalBuffer } = await readImage(saved.imagePath, user.id);
    const forVision = await normalizeForOpenAi(originalBuffer, {
      maxDimension: 1280,
    });

    const { items, raw, usage } = await recognizeOutfitPhoto(
      forVision.buffer.toString("base64"),
      forVision.mimeType,
    );

    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: usage.model,
      status: AiUsageStatus.COMPLETED,
      estimatedCostUsd: ESTIMATED_COST.outfitRecognition,
      finalCostUsd: usage.costUsd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    if (items.length === 0) {
      return Response.json({
        sourceImagePath: saved.imagePath,
        sourceImageUrl: imageUrl(saved.imagePath),
        items: [],
        message:
          "Er werden geen kledingstukken herkend op deze foto. Probeer een andere foto of voeg handmatig toe.",
        raw,
      });
    }

    const enriched = await Promise.all(
      items.map(async (item, index) => {
        let imagePath = saved.imagePath;
        let mimeType = saved.mimeType;
        let originalName = `outfit-item-${index + 1}.jpg`;

        if (item.boundingBox) {
          try {
            const crop = await cropFromImage(originalBuffer, item.boundingBox);
            imagePath = await saveBuffer(
              "clothing",
              user.id,
              crop.buffer,
              "jpg",
            );
            mimeType = crop.mimeType;
          } catch (error) {
            console.error("[recognize-outfit] crop failed", error);
            // Val terug op de originele foto voor dit item.
          }
        }

        return {
          imagePath,
          imageUrl: imageUrl(imagePath),
          mimeType,
          originalName,
          suggestion: {
            name: item.name,
            mainCategory: item.mainCategory,
            subCategory: item.subCategory,
            colors: item.colors,
            pattern: item.pattern,
            seasons: item.seasons,
            formality: item.formality,
            styleTags: item.styleTags,
            occasions: item.occasions,
            description: item.description,
          },
          boundingBox: item.boundingBox,
        };
      }),
    );

    return Response.json({
      sourceImagePath: saved.imagePath,
      sourceImageUrl: imageUrl(saved.imagePath),
      items: enriched,
      raw,
    });
  } catch (error) {
    console.error("[recognize-outfit] failed", error);
    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: config.openai.visionModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.outfitRecognition,
      finalCostUsd: 0,
      errorMessage: error instanceof Error ? error.message : "Onbekende fout.",
    });
    const message =
      error instanceof OpenAiNotConfiguredError
        ? error.message
        : "Het herkennen van de outfit is mislukt. Probeer het opnieuw.";
    return Response.json({ error: message }, { status: 502 });
  }
}
