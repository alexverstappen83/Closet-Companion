import type { NextRequest } from "next/server";
import { AiTaskType, AiUsageStatus } from "@prisma/client";
import { z } from "zod";

import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import {
  ESTIMATED_COST,
  generateStyleAdvice,
  OpenAiNotConfiguredError,
} from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  occasion: z.string().trim().min(1, "Beschrijf de gelegenheid.").max(200),
  preferences: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  if (!isOpenAiConfigured()) {
    return Response.json(
      { error: "AI-stijladvies is niet beschikbaar (geen OpenAI-configuratie)." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." },
      { status: 400 },
    );
  }

  const items = await prisma.clothingItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (items.length === 0) {
    return Response.json(
      { error: "Je kledingkast is nog leeg. Voeg eerst kledingstukken toe." },
      { status: 400 },
    );
  }

  try {
    await assertWithinBudget(user.id, ESTIMATED_COST.advice);
  } catch (error) {
    if (error instanceof BudgetError) {
      await logAiUsage({
        userId: user.id,
        taskType: AiTaskType.STYLE_ADVICE,
        model: config.openai.textModel,
        status: AiUsageStatus.BLOCKED_BY_BUDGET,
        estimatedCostUsd: ESTIMATED_COST.advice,
        finalCostUsd: 0,
        errorMessage: error.message,
      });
      return Response.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  try {
    const { advices, usage } = await generateStyleAdvice({
      occasion: parsed.data.occasion,
      preferences: parsed.data.preferences,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory,
        colors: item.colors,
        formality: item.formality,
        seasons: item.seasons,
        styleTags: item.styleTags,
      })),
    });

    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.STYLE_ADVICE,
      model: usage.model,
      status: AiUsageStatus.COMPLETED,
      estimatedCostUsd: ESTIMATED_COST.advice,
      finalCostUsd: usage.costUsd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    const itemById = new Map(items.map((item) => [item.id, item]));
    const options = advices.map((advice) => ({
      advice,
      recommendedItems: advice.recommendedItemIds
        .map((id) => itemById.get(id))
        .filter((item): item is (typeof items)[number] => Boolean(item))
        .map((item) => ({
          id: item.id,
          name: item.name,
          mainCategory: item.mainCategory,
          imagePath: item.imagePath,
        })),
    }));

    return Response.json({ options });
  } catch (error) {
    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.STYLE_ADVICE,
      model: config.openai.textModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.advice,
      finalCostUsd: 0,
      errorMessage: error instanceof Error ? error.message : "Onbekende fout.",
    });
    const message =
      error instanceof OpenAiNotConfiguredError
        ? error.message
        : "Het genereren van stijladvies is mislukt. Probeer het later opnieuw.";
    return Response.json({ error: message }, { status: 502 });
  }
}
