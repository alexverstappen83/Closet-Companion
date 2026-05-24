"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BODY_BUILDS,
  GENDER_PRESENTATIONS,
  HAIR_LENGTHS,
  SKIN_TONES,
} from "@/lib/constants";
import {
  changePassword,
  updatePersonProfile,
  updateProfile,
} from "@/lib/actions/profile";

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

export interface PersonProfileInitial {
  ageYears: number | null;
  heightCm: number | null;
  bodyBuild: string | null;
  hairColor: string | null;
  hairLength: string | null;
  skinTone: string | null;
  genderPresentation: string | null;
  wearsGlasses: boolean | null;
  facialHair: string | null;
  appearanceNotes: string | null;
}

export function ProfileView({
  initialName,
  initialPersonProfile,
}: {
  initialName: string;
  initialPersonProfile: PersonProfileInitial;
}) {
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

  const [ageYears, setAgeYears] = useState(
    initialPersonProfile.ageYears?.toString() ?? "",
  );
  const [heightCm, setHeightCm] = useState(
    initialPersonProfile.heightCm?.toString() ?? "",
  );
  const [bodyBuild, setBodyBuild] = useState(
    initialPersonProfile.bodyBuild ?? "",
  );
  const [hairColor, setHairColor] = useState(
    initialPersonProfile.hairColor ?? "",
  );
  const [hairLength, setHairLength] = useState(
    initialPersonProfile.hairLength ?? "",
  );
  const [skinTone, setSkinTone] = useState(initialPersonProfile.skinTone ?? "");
  const [genderPresentation, setGenderPresentation] = useState(
    initialPersonProfile.genderPresentation ?? "",
  );
  const [wearsGlasses, setWearsGlasses] = useState<"" | "ja" | "nee">(
    initialPersonProfile.wearsGlasses === true
      ? "ja"
      : initialPersonProfile.wearsGlasses === false
        ? "nee"
        : "",
  );
  const [facialHair, setFacialHair] = useState(
    initialPersonProfile.facialHair ?? "",
  );
  const [appearanceNotes, setAppearanceNotes] = useState(
    initialPersonProfile.appearanceNotes ?? "",
  );
  const [personPending, startPerson] = useTransition();
  const [personState, setPersonState] = useState<
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

  function savePersonProfile(event: React.FormEvent) {
    event.preventDefault();
    setPersonState(null);
    const ageNumber = ageYears.trim() ? Number(ageYears) : null;
    const heightNumber = heightCm.trim() ? Number(heightCm) : null;
    if (ageNumber !== null && !Number.isInteger(ageNumber)) {
      setPersonState({ error: "Leeftijd moet een heel getal zijn." });
      return;
    }
    if (heightNumber !== null && !Number.isInteger(heightNumber)) {
      setPersonState({ error: "Lengte moet een heel getal zijn." });
      return;
    }
    startPerson(async () => {
      const result = await updatePersonProfile({
        ageYears: ageNumber,
        heightCm: heightNumber,
        bodyBuild: bodyBuild || null,
        hairColor: hairColor || null,
        hairLength: hairLength || null,
        skinTone: skinTone || null,
        genderPresentation: genderPresentation || null,
        wearsGlasses:
          wearsGlasses === "ja" ? true : wearsGlasses === "nee" ? false : null,
        facialHair: facialHair || null,
        appearanceNotes: appearanceNotes || null,
      });
      setPersonState(result.ok ? { ok: true } : { error: result.error });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle2 className="h-4 w-4 text-primary" />
            Persoonsprofiel voor AI-visualisaties
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Optionele velden. Als je ze invult worden ze als tekstanker
            meegegeven aan de AI, zodat leeftijd, lichaamsbouw en uiterlijk
            tussen visualisaties veel consistenter blijven.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePersonProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ageYears">Leeftijd</Label>
                <Input
                  id="ageYears"
                  type="number"
                  min={1}
                  max={149}
                  value={ageYears}
                  onChange={(event) => setAgeYears(event.target.value)}
                  placeholder="bijv. 37"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heightCm">Lengte (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  min={100}
                  max={229}
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="bijv. 182"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genderPresentation">Genderpresentatie</Label>
                <Select
                  id="genderPresentation"
                  value={genderPresentation}
                  onChange={(event) =>
                    setGenderPresentation(event.target.value)
                  }
                >
                  <option value="">— niet gespecificeerd —</option>
                  {GENDER_PRESENTATIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyBuild">Lichaamsbouw</Label>
                <Select
                  id="bodyBuild"
                  value={bodyBuild}
                  onChange={(event) => setBodyBuild(event.target.value)}
                >
                  <option value="">— niet gespecificeerd —</option>
                  {BODY_BUILDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hairLength">Haarlengte</Label>
                <Select
                  id="hairLength"
                  value={hairLength}
                  onChange={(event) => setHairLength(event.target.value)}
                >
                  <option value="">— niet gespecificeerd —</option>
                  {HAIR_LENGTHS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hairColor">Haarkleur</Label>
                <Input
                  id="hairColor"
                  value={hairColor}
                  onChange={(event) => setHairColor(event.target.value)}
                  placeholder="bijv. donkerblond"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skinTone">Huidskleur</Label>
                <Select
                  id="skinTone"
                  value={skinTone}
                  onChange={(event) => setSkinTone(event.target.value)}
                >
                  <option value="">— niet gespecificeerd —</option>
                  {SKIN_TONES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wearsGlasses">Draagt een bril</Label>
                <Select
                  id="wearsGlasses"
                  value={wearsGlasses}
                  onChange={(event) =>
                    setWearsGlasses(event.target.value as "" | "ja" | "nee")
                  }
                >
                  <option value="">— niet gespecificeerd —</option>
                  <option value="ja">Ja</option>
                  <option value="nee">Nee</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facialHair">Gezichtsbeharing</Label>
                <Input
                  id="facialHair"
                  value={facialHair}
                  onChange={(event) => setFacialHair(event.target.value)}
                  placeholder="bijv. korte baard, of laat leeg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appearanceNotes">Extra kenmerken (optioneel)</Label>
              <Textarea
                id="appearanceNotes"
                value={appearanceNotes}
                onChange={(event) => setAppearanceNotes(event.target.value)}
                placeholder="bijv. brede schouders, tatoeage op linkerarm, sportief postuur"
                maxLength={500}
              />
            </div>

            <Feedback state={personState} />
            <Button type="submit" disabled={personPending}>
              {personPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Persoonsprofiel opslaan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
