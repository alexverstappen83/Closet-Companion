import { prisma } from "@/lib/prisma";

/**
 * Publieke registratie is alleen open zolang er nog geen enkele gebruiker bestaat.
 * De eerste geregistreerde gebruiker wordt automatisch admin (sectie 6.1).
 */
export async function isRegistrationOpen(): Promise<boolean> {
  const count = await prisma.user.count();
  return count === 0;
}
