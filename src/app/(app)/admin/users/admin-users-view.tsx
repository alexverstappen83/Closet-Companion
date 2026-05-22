"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2, KeyRound, Plus, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createUser, resetUserPassword, setUserActive } from "@/lib/actions/admin";
import { formatUsd } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  clothingCount: number;
  outfitCount: number;
  aiUsedUsd: number;
}

export function AdminUsersView({
  users,
  currentUserId,
  budget,
}: {
  users: AdminUser[];
  currentUserId: string;
  budget: number;
}) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, startReset] = useTransition();

  const [busyId, setBusyId] = useState<string | null>(null);

  function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    startCreate(async () => {
      const result = await createUser({ name, email, password, role });
      if (result.ok) {
        setCreateOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("USER");
        router.refresh();
      } else {
        setCreateError(result.error);
      }
    });
  }

  function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    startReset(async () => {
      const result = await resetUserPassword(resetTarget.id, newPassword);
      if (result.ok) {
        setResetTarget(null);
        setNewPassword("");
        router.refresh();
      } else {
        setResetError(result.error);
      }
    });
  }

  async function toggleActive(user: AdminUser) {
    setBusyId(user.id);
    await setUserActive(user.id, !user.isActive);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nieuwe gebruiker
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Gebruiker</th>
                <th className="pb-2 pr-3 font-medium">Rol</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Kledingkast</th>
                <th className="pb-2 pr-3 font-medium">AI-gebruik</th>
                <th className="pb-2 font-medium">Acties</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role === "ADMIN" ? "Beheerder" : "Gebruiker"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={user.isActive ? "success" : "destructive"}>
                      {user.isActive ? "Actief" : "Gedeactiveerd"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {user.clothingCount} stuks · {user.outfitCount} outfits
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                    {formatUsd(user.aiUsedUsd)} / {formatUsd(budget)}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResetTarget(user)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Wachtwoord
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={user.id === currentUserId || busyId === user.id}
                        onClick={() => toggleActive(user)}
                      >
                        {busyId === user.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {user.isActive ? "Deactiveren" : "Activeren"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Nieuwe gebruiker
            </DialogTitle>
            <DialogDescription>
              De gebruiker logt in met dit e-mailadres en wachtwoord.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Naam</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Naam van de gebruiker"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mailadres</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Wachtwoord</Label>
              <Input
                id="new-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                placeholder="Minimaal 8 tekens"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Rol</Label>
              <Select
                id="new-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "USER" | "ADMIN")
                }
              >
                <option value="USER">Gebruiker</option>
                <option value="ADMIN">Beheerder</option>
              </Select>
            </div>
            {createError && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {createError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Account aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPassword("");
            setResetError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wachtwoord opnieuw instellen</DialogTitle>
            <DialogDescription>
              Stel een nieuw wachtwoord in voor {resetTarget?.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nieuw wachtwoord</Label>
              <Input
                id="reset-password"
                type="text"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
                placeholder="Minimaal 8 tekens"
              />
            </div>
            {resetError && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {resetError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetTarget(null)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
                Wachtwoord instellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
