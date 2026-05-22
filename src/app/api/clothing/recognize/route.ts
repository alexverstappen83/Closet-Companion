import type { NextRequest } from "next/server";
import { AiTaskType, AiUsageStatus } from "@prisma/client";

import { assertWithinBudget, BudgetError, logAiUsage } from "@/lib/budget";
import { config, isOpenAiConfigured } from "@/lib/config";
import { apiUser } from "@/lib/guards";
import { ESTIMATED_COST, recognizeClothing } from "@/lib/openai";
import { saveUpload, UploadError } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) {
    return Response.json({ error: "Niet geautoriseerd." }, { status: 401 });
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

  const base = {
    imagePath: saved.imagePath,
    mimeType: saved.mimeType,
    originalName: saved.originalName,
  };

  // De foto is opgeslagen. AI-herkenning is optioneel: de gebruiker kan altijd
  // handmatig verder (specificatie sectie 11.1).
  if (formData.get("skipAi")) {
    return Response.json({
      ...base,
      aiStatus: "skipped",
      message: "AI-herkenning is overgeslagen. Vul de gegevens zelf in.",
    });
  }

  if (!isOpenAiConfigured()) {
    return Response.json({
      ...base,
      aiStatus: "unavailable",
      message:
        "AI-herkenning is niet beschikbaar. Vul de gegevens handmatig in.",
    });
  }

  try {
    await assertWithinBudget(user.id, ESTIMATED_COST.recognition);
  } catch (error) {
    if (error instanceof BudgetError) {
      await logAiUsage({
        userId: user.id,
        taskType: AiTaskType.CLOTHING_RECOGNITION,
        model: config.openai.visionModel,
        status: AiUsageStatus.BLOCKED_BY_BUDGET,
        estimatedCostUsd: ESTIMATED_COST.recognition,
        finalCostUsd: 0,
        errorMessage: error.message,
      });
      return Response.json({
        ...base,
        aiStatus: "blocked",
        message: error.message,
      });
    }
    throw error;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { suggestion, raw, usage } = await recognizeClothing(
      buffer.toString("base64"),
      saved.mimeType,
    );

    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: usage.model,
      status: AiUsageStatus.COMPLETED,
      estimatedCostUsd: ESTIMATED_COST.recognition,
      finalCostUsd: usage.costUsd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });

    return Response.json({ ...base, aiStatus: "completed", suggestion, raw });
  } catch (error) {
    await logAiUsage({
      userId: user.id,
      taskType: AiTaskType.CLOTHING_RECOGNITION,
      model: config.openai.visionModel,
      status: AiUsageStatus.FAILED,
      estimatedCostUsd: ESTIMATED_COST.recognition,
      finalCostUsd: 0,
      errorMessage: error instanceof Error ? error.message : "Onbekende fout.",
    });
    return Response.json({
      ...base,
      aiStatus: "failed",
      message:
        "AI-herkenning is mislukt. Je kunt de gegevens handmatig invullen.",
    });
  }
}
