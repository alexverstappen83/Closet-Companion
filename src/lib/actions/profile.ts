"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { apiUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
});

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
