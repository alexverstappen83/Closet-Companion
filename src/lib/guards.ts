import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: "ADMIN" | "USER";
}

/** Voor server components: stuurt door naar /login als er geen sessie is. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

/** Voor server components: vereist de admin-rol. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

/** Voor API-routes: geeft de gebruiker terug, of null bij geen sessie. */
export async function apiUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}
