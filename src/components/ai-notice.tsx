import { Info } from "lucide-react";

export function AiNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-accent-foreground/15 bg-accent/60 px-3 py-2.5 text-xs leading-relaxed text-accent-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
