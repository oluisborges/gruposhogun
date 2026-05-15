import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-compatible config — no Prisma, no Node.js-only imports.
// Used by middleware for JWT verification only.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isApiAuth = pathname.startsWith("/api/auth");
      const isLoginPage = pathname.startsWith("/login");

      if (isApiAuth) return true;

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { id: string; role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [],
};
