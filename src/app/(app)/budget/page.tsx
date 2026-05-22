import type { Metadata } from "next";
import { AiTaskType, AiUsageStatus } from "@prisma/client";

import { BudgetCard } from "@/components/budget-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBudgetStatus } from "@/lib/budget";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDate, formatUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI-budget" };

const TASK_LABELS: Record<AiTaskType, string> = {
  CLOTHING_RECOGNITION: "Kledingherkenning",
  CLOSET_ORGANIZATION: "Kledingkast ordenen",
  STYLE_ADVICE: "Stijladvies",
  OUTFIT_IMAGE_GENERATION: "Outfitvisualisatie",
};

const STATUS_LABELS: Record<
  AiUsageStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Bezig", variant: "secondary" },
  COMPLETED: { label: "Voltooid", variant: "success" },
  FAILED: { label: "Mislukt", variant: "destructive" },
  BLOCKED_BY_BUDGET: { label: "Geblokkeerd", variant: "warning" },
};

export default async function BudgetPage() {
  const user = await requireUser();
  const budget = await getBudgetStatus(user.id);

  const logs = await prisma.aiUsageLog.findMany({
    where: { userId: user.id, createdAt: { gte: budget.monthStart } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI-budget"
        description={`Elke gebruiker heeft ${formatUsd(
          budget.budget,
        )} AI-tegoed per kalendermaand.`}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <BudgetCard status={budget} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              AI-gebruik deze maand ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Je hebt deze maand nog geen AI-functies gebruikt.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Datum</th>
                      <th className="pb-2 pr-3 font-medium">Functie</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const status = STATUS_LABELS[log.status];
                      const cost = Number(log.finalCostUsd ?? log.estimatedCostUsd);
                      return (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3 text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-2.5 pr-3">
                            {TASK_LABELS[log.taskType]}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {log.status === "FAILED" ||
                            log.status === "BLOCKED_BY_BUDGET"
                              ? "—"
                              : formatUsd(cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
