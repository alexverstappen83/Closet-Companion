"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, updateProfile } from "@/lib/actions/profile";

function Feedback({
  state,
}: {
  state: { ok?: boolean; error?: string } | null;
}) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Opgeslagen.
      </p>
    );
  }
  return null;
}

export function ProfileView({ initialName }: { initialName: string }) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [profilePending, startProfile] = useTransition();
  const [profileState, setProfileState] = useState<
    { ok?: boolean; error?: string } | null
  >(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, startPassword] = useTransition();
  const [passwordState, setPasswordState] = useState<
    { ok?: boolean; error?: string } | null
  >(null);

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileState(null);
    startProfile(async () => {
      const result = await updateProfile({ name });
      setProfileState(result.ok ? { ok: true } : { error: result.error });
      if (result.ok) router.refresh();
    });
  }

  function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordState(null);
    if (newPassword !== confirmPassword) {
      setPasswordState({ error: "De nieuwe wachtwoorden komen niet overeen." });
      return;
    }
    startPassword(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      if (result.ok) {
        setPasswordState({ ok: true });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordState({ error: result.error });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profiel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Je naam"
              />
            </div>
            <Feedback state={profileState} />
            <Button type="submit" disabled={profilePending}>
              {profilePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Profiel opslaan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wachtwoord wijzigen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Huidig wachtwoord</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig nieuw wachtwoord</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <Feedback state={passwordState} />
            <Button type="submit" disabled={passwordPending}>
              {passwordPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Wachtwoord wijzigen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
