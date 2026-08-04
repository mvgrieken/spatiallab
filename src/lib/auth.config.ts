import type { NextAuthConfig } from "next-auth";

/**
 * Shared, Node-free auth config — the proxy runs on the edge runtime and only
 * needs JWT decoding. The Credentials provider (with bcrypt) is added
 * exclusively in lib/auth.ts; its authorize() runs in the Node route handler.
 *
 * This mirrors the canonical atthis pattern (atthis-ai/apps/kompas), minus
 * Prisma: SpatialLab is deliberately database-less, so the single allowed
 * account comes from environment variables instead of a User table.
 */
export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Explicit session duration; cookie flags stay on NextAuth's secure
  // defaults (httpOnly, SameSite=Lax, Secure + __Secure- prefix on https).
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      session.user.id = (token.id as string) ?? token.sub ?? "";
      return session;
    },
  },
} satisfies NextAuthConfig;

/** The auth gate is active only when fully configured (see README). */
export function authGateEnabled(): boolean {
  return Boolean(
    process.env.NEXTAUTH_SECRET &&
      process.env.AUTH_ALLOWED_EMAIL &&
      process.env.AUTH_PASSWORD_HASH,
  );
}
