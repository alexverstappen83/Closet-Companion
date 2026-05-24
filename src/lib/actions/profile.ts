"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import {
  BODY_BUILDS,
  GENDER_PRESENTATIONS,
  HAIR_LENGTHS,
  SKIN_TONES,
} from "@/lib/constants";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
});

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function oneOf<T extends string>(allowed: readonly T[]) {
  const set = new Set<string>(allowed);
  return (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return set.has(trimmed) ? trimmed : null;
  };
}

const personProfileSchema = z.object({
  ageYears: z.number().int().min(1).max(149).nullable().optional(),
  heightCm: z.number().int().min(100).max(229).nullable().optional(),
  bodyBuild: z.string().trim().max(60).nullable().optional(),
  hairColor: z.string().trim().max(60).nullable().optional(),
  hairLength: z.string().trim().max(60).nullable().optional(),
  skinTone: z.string().trim().max(60).nullable().optional(),
  genderPresentation: z.string().trim().max(60).nullable().optional(),
  wearsGlasses: z.boolean().nullable().optional(),
  facialHair: z.string().trim().max(60).nullable().optional(),
  appearanceNotes: z.string().trim().max(500).nullable().optional(),
});

export type PersonProfileInput = z.infer<typeof personProfileSchema>;

const normalizeBuild = oneOf(BODY_BUILDS);
const normalizeHairLength = oneOf(HAIR_LENGTHS);
const normalizeSkinTone = oneOf(SKIN_TONES);
const normalizeGender = oneOf(GENDER_PRESENTATIONS);

export async function updatePersonProfile(
  input: PersonProfileInput,
): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = personProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Ongeldige invoer.",
    };
  }
  const data = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ageYears: data.ageYears ?? null,
      heightCm: data.heightCm ?? null,
      bodyBuild: normalizeBuild(data.bodyBuild ?? null),
      hairColor: trimmedOrNull(data.hairColor ?? null),
      hairLength: normalizeHairLength(data.hairLength ?? null),
      skinTone: normalizeSkinTone(data.skinTone ?? null),
      genderPresentation: normalizeGender(data.genderPresentation ?? null),
      wearsGlasses: data.wearsGlasses ?? null,
      facialHair: trimmedOrNull(data.facialHair ?? null),
      appearanceNotes: trimmedOrNull(data.appearanceNotes ?? null),
    },
  });

  revalidatePath("/profile");
  return { ok: true };
}

export async function updateProfile(input: {
  name?: string;
}): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ongeldige invoer." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name || null },
  });

  revalidatePath("/profile");
  return { ok: true };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Vul je huidige wachtwoord in."),
  newPassword: z.string().min(8, "Het nieuwe wachtwoord moet minimaal 8 tekens hebben."),
});

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { ok: false, error: "Gebruiker niet gevonden." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!valid) {
    return { ok: false, error: "Je huidige wachtwoord klopt niet." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidatePath("/profile");
  return { ok: true };
}
