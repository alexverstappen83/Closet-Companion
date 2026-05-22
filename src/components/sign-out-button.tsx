import { LogOut } from "lucide-react";

import { signOutAction } from "@/lib/actions/session";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Uitloggen
      </button>
    </form>
  );
}
