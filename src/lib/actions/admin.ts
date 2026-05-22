"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { apiUser, type SessionUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

type AdminActor =
  | { ok: false; error: string }
  | { ok: true; user: SessionUser };

async function requireAdminActor(): Promise<AdminActor> {
  const user = await apiUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };
  if (user.role !== "ADMIN") {
    return { ok: false, error: "Alleen beheerders mogen dit." };
  }
  return { ok: true, user };
}

const createUserSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: z.string().min(8, "Het wachtwoord moet minimaal 8 tekens hebben."),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Dit e-mailadres is al in gebruik." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name || null,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true, id: user.id };
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  if (id === actor.user.id) {
    return { ok: false, error: "Je kunt je eigen account niet deactiveren." };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Gebruiker niet gevonden." };

  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
  return { ok: true };
}

const resetPasswordSchema = z
  .string()
  .min(8, "Het wachtwoord moet minimaal 8 tekens hebben.");

export async function resetUserPassword(
  id: string,
  newPassword: string,
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const parsed = resetPasswordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Ongeldig wachtwoord." };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "Gebruiker niet gevonden." };

  const passwordHash = await bcrypt.hash(parsed.data, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/admin/users");
  return { ok: true };
}
