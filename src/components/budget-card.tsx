import { AlertTriangle, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BudgetStatus } from "@/lib/budget";
import { cn, formatUsd } from "@/lib/utils";

function tone(percentage: number): {
  indicator: string;
  message: string | null;
} {
  if (percentage >= 100) {
    return {
      indicator: "bg-destructive",
      message:
        "Je AI-tegoed voor deze maand is op. Je nieuwe tegoed start volgende maand opnieuw.",
    };
  }
  if (percentage >= 95) {
    return {
      indicator: "bg-destructive",
      message: "Je hebt bijna je volledige AI-tegoed gebruikt (95%).",
    };
  }
  if (percentage >= 80) {
    return {
      indicator: "bg-amber-500",
      message: "Je hebt 80% van je maandelijkse AI-tegoed gebruikt.",
    };
  }
  if (percentage >= 50) {
    return {
      indicator: "bg-amber-400",
      message: "Je hebt de helft van je maandelijkse AI-tegoed gebruikt.",
    };
  }
  return { indicator: "bg-primary", message: null };
}

export function BudgetCard({
  status,
  compact = false,
}: {
  status: BudgetStatus;
  compact?: boolean;
}) {
  const { indicator, message } = tone(status.percentage);

  return (
    <Card>
      <CardHeader className={cn(compact && "pb-3")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-tegoed deze maand
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold">
            {formatUsd(status.used)}
          </span>
          <span className="text-sm text-muted-foreground">
            van {formatUsd(status.budget)}
          </span>
        </div>
        <Progress value={status.percentage} indicatorClassName={indicator} />
        <p className="text-sm text-muted-foreground">
          Nog {formatUsd(status.remaining)} beschikbaar
        </p>
        {message && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
