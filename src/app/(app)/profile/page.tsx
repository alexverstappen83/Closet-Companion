import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import { ProfileView } from "./profile-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profiel" };

export default async function ProfilePage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      ageYears: true,
      heightCm: true,
      bodyBuild: true,
      hairColor: true,
      hairLength: true,
      skinTone: true,
      genderPresentation: true,
      wearsGlasses: true,
      facialHair: true,
      appearanceNotes: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profiel"
        description="Beheer je accountgegevens en wachtwoord."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">E-mailadres</p>
            <p className="font-medium">{record?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rol</p>
            <Badge variant={record?.role === "ADMIN" ? "default" : "secondary"}>
              {record?.role === "ADMIN" ? "Beheerder" : "Gebruiker"}
            </Badge>
          </div>
          {record?.createdAt && (
            <div>
              <p className="text-xs text-muted-foreground">Lid sinds</p>
              <p className="font-medium">{formatDate(record.createdAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ProfileView
        initialName={record?.name ?? ""}
        initialPersonProfile={{
          ageYears: record?.ageYears ?? null,
          heightCm: record?.heightCm ?? null,
          bodyBuild: record?.bodyBuild ?? null,
          hairColor: record?.hairColor ?? null,
          hairLength: record?.hairLength ?? null,
          skinTone: record?.skinTone ?? null,
          genderPresentation: record?.genderPresentation ?? null,
          wearsGlasses: record?.wearsGlasses ?? null,
          facialHair: record?.facialHair ?? null,
          appearanceNotes: record?.appearanceNotes ?? null,
        }}
      />
    </div>
  );
}
