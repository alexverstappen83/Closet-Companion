import { AiTaskType, AiUsageStatus, Prisma } from "@prisma/client";

import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetError";
  }
}

export interface BudgetStatus {
  budget: number;
  used: number;
  remaining: number;
  percentage: number;
  monthStart: Date;
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function costOfLog(log: {
  status: AiUsageStatus;
  estimatedCostUsd: Prisma.Decimal;
  finalCostUsd: Prisma.Decimal | null;
}): number {
  if (log.status === AiUsageStatus.FAILED || log.status === AiUsageStatus.BLOCKED_BY_BUDGET) {
    return 0;
  }
  const value = log.finalCostUsd ?? log.estimatedCostUsd;
  return Number(value);
}

/** Berekent het verbruikte AI-tegoed van een gebruiker voor de huidige kalendermaand. */
export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const monthStart = currentMonthStart();
  const logs = await prisma.aiUsageLog.findMany({
    where: { userId, createdAt: { gte: monthStart } },
    select: { status: true, estimatedCostUsd: true, finalCostUsd: true },
  });

  const used = logs.reduce((total, log) => total + costOfLog(log), 0);
  const budget = config.monthlyAiBudgetUsd;
  const remaining = Math.max(0, budget - used);
  const percentage = budget > 0 ? Math.min(100, (used / budget) * 100) : 100;

  return { budget, used, remaining, percentage, monthStart };
}

/** Drempelwaarde voor waarschuwingen, conform specificatie sectie 16.4. */
export function warningLevel(percentage: number): 50 | 80 | 95 | 100 | null {
  if (percentage >= 100) return 100;
  if (percentage >= 95) return 95;
  if (percentage >= 80) return 80;
  if (percentage >= 50) return 50;
  return null;
}

/** Controleert vóór een AI-aanroep of de geschatte kosten binnen het budget passen. */
export async function assertWithinBudget(
  userId: string,
  estimatedCostUsd: number,
): Promise<BudgetStatus> {
  const status = await getBudgetStatus(userId);
  if (status.used + estimatedCostUsd > status.budget) {
    throw new BudgetError(
      `Je AI-tegoed voor deze maand is (bijna) op. Je hebt ${status.used.toFixed(
        2,
      )} van ${status.budget.toFixed(2)} USD gebruikt. Je nieuwe tegoed start volgende maand opnieuw.`,
    );
  }
  return status;
}

export interface LogAiUsageInput {
  userId: string;
  taskType: AiTaskType;
  model: string;
  status: AiUsageStatus;
  estimatedCostUsd: number;
  finalCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  errorMessage?: string;
  relatedClothingId?: string;
  relatedOutfitId?: string;
  relatedImageId?: string;
}

/** Registreert AI-gebruik in de database (sectie 16.6). */
export async function logAiUsage(input: LogAiUsageInput) {
  return prisma.aiUsageLog.create({
    data: {
      userId: input.userId,
      taskType: input.taskType,
      model: input.model,
      status: input.status,
      estimatedCostUsd: new Prisma.Decimal(input.estimatedCostUsd.toFixed(6)),
      finalCostUsd:
        input.finalCostUsd === undefined
          ? null
          : new Prisma.Decimal(input.finalCostUsd.toFixed(6)),
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.totalTokens,
      imageCount: input.imageCount,
      errorMessage: input.errorMessage,
      relatedClothingId: input.relatedClothingId,
      relatedOutfitId: input.relatedOutfitId,
      relatedImageId: input.relatedImageId,
    },
  });
}
