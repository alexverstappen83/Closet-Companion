import type { NextRequest } from "next/server";
import { AiTaskType, AiUsageStatus } from "@prisma/client";
import { z } from "zod";

import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import {
  ESTIMATED_COST,
  generateOutfitVisualization,
  OpenAiNotConfiguredError,
} from "@/lib/openai";
import { imageUrl } from "@/lib/image-url";
import { prisma } from "@/lib/prisma";
import { readImage, saveBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  outfitId: z.string().trim().min(1),
});

const PROMPT_VERSION = "v2";

function describeItem(item: {
  name: string;
  mainCategory: string;
  subCategory: string | null;
  colors: string[];
  pattern: string | null;
  formality: string | null;
  notes: string | null;
}): string {
  const parts = [item.name];
  parts.push(`type: ${item.subCategory ?? item.mainCategory}`);
  if (item.colors.length) parts.push(`kleur: ${item.colors.join(", ")}`);
  parts.push(`patroon: ${item.pattern ?? "egaal, geen prints of logo's"}`);
  if (item.formality) parts.push(`stijl: ${item.formality}`);
  if (item.notes) parts.push(`extra: ${item.notes}`);
  return parts.join("; ");
}

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return Response.json(
      { error: "AI-visualisatie is niet beschikbaar (geen OpenAI-configuratie)." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Ongeldige invoer." }, { status: 400 });
  }

  const outfit = await prisma.outfit.findUnique({
    where: { id: parsed.data.outfitId },
    include: { items: { include: { clothingItem: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!outfit || outfit.userId !== user.id) {
    return Response.json({ error: "Outfit niet gevonden." }, { status: 404 });
  }
  if (outfit.items.length === 0) {
    return Response.json(
      { error: "Deze outfit bevat geen kledingstukken." },
      { status: 400 },
    );
  }

  const primary = await prisma.referencePhoto.findFirst({
    where: { userId: user.id, isPrimary: true },
  });
  if (!primary) {
    return Response.json(
      {
        error:
          "Je hebt nog geen primaire referentiefoto. Upload er één bij Referentiefoto's.",
      },
      { status: 400 },
    );
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
        relatedOutfitId: outfit.id,
      });
      return Response.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  let generatedId: string | undefined;
  try {
    const reference = await readImage(primary.imagePath, user.id);
    const { image, usage } = await generateOutfitVisualization({
      referenceImage: reference.buffer,
      referenceMimeType: reference.mimeType,
      itemDescriptions: outfit.items.map((entry) =>
        describeItem(entry.clothingItem),
      ),
      context: outfit.occasion ?? outfit.name,
    });

    const storedPath = await saveBuffer("outfit-previews", user.id, image, "png");
    const generated = await prisma.generatedOutfitImage.create({
      data: {
        userId: user.id,
        outfitId: outfit.id,
        referencePhotoId: primary.id,
        imagePath: storedPath,
        promptVersion: PROMPT_VERSION,
        openAiModel: usage.model,
        estimatedCostUsd: usage.costUsd,
        status: "COMPLETED",
      },
    });
    generatedId = generated.id;

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
      relatedOutfitId: outfit.id,
      relatedImageId: generated.id,
    });

    return Response.json({
      generatedId: generated.id,
      imageUrl: imageUrl(storedPath),
    });
  } catch (error) {
    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.OUTFIT_IMAGE_GENERATION,
      model: config.openai.imageModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.visualization,
      finalCostUsd: 0,
      errorMessage: error instanceof Error ? error.message : "Onbekende fout.",
      relatedOutfitId: outfit.id,
      relatedImageId: generatedId,
    });
    const message =
      error instanceof OpenAiNotConfiguredError
        ? error.message
        : "Het genereren van de visualisatie is mislukt. Probeer het later opnieuw.";
    return Response.json({ error: message }, { status: 502 });
  }
}
