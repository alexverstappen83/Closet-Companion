"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRegistrationOpen } from "@/lib/registration";

export interface FormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: z.string().min(1, "Vul je wachtwoord in."),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Onjuist e-mailadres of wachtwoord, of dit account is gedeactiveerd.",
      };
    }
    throw error;
  }

  redirect("/dashboard");
}

const registerSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    email: z.string().email("Vul een geldig e-mailadres in."),
    password: z.string().min(8, "Het wachtwoord moet minimaal 8 tekens hebben."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "De wachtwoorden komen niet overeen.",
    path: ["confirmPassword"],
  });

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isRegistrationOpen())) {
    return {
      error:
        "Registratie is gesloten. Vraag een beheerder om een account aan te maken.",
    };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ongeldige invoer." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Dit e-mailadres is al in gebruik." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // De eerste gebruiker wordt automatisch admin (specificatie sectie 6.1).
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name || null,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }

  redirect("/dashboard");
}
