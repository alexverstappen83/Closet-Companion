import type { NextAuthConfig } from "next-auth";

const PUBLIC_ROUTES = ["/login", "/register"];

// Edge-veilige configuratie: geen Prisma of bcrypt hier.
// Wordt gedeeld door de middleware en de volledige auth-setup.
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
      if (isPublic) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl),
        );
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: "ADMIN" | "USER" }).role ?? "USER";
        token.name = user.name ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
