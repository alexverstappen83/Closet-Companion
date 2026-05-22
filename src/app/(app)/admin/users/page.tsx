import type { Metadata } from "next";
import { AiUsageStatus } from "@prisma/client";

import { PageHeader } from "@/components/page-header";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

import { AdminUsersView } from "./admin-users-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gebruikersbeheer" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  );

  const [users, logs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { clothingItems: true, outfits: true } },
      },
    }),
    prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: monthStart } },
      select: {
        userId: true,
        status: true,
        estimatedCostUsd: true,
        finalCostUsd: true,
      },
    }),
  ]);

  const usageByUser = new Map<string, number>();
  for (const log of logs) {
    if (
      log.status === AiUsageStatus.FAILED ||
      log.status === AiUsageStatus.BLOCKED_BY_BUDGET
    ) {
      continue;
    }
    const cost = Number(log.finalCostUsd ?? log.estimatedCostUsd);
    usageByUser.set(log.userId, (usageByUser.get(log.userId) ?? 0) + cost);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gebruikersbeheer"
        description="Maak nieuwe accounts aan en beheer bestaande gebruikers."
      />
      <AdminUsersView
        currentUserId={admin.id}
        budget={config.monthlyAiBudgetUsd}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          clothingCount: user._count.clothingItems,
          outfitCount: user._count.outfits,
          aiUsedUsd: usageByUser.get(user.id) ?? 0,
        }))}
      />
    </div>
  );
}
