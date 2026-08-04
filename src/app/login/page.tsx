import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error, code } = await searchParams;
  // The server action puts the code in ?error=, the Auth.js API flow in ?code=.
  const reason = code ?? error;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      // NEXT_REDIRECT (successful login) must bubble up; only auth errors
      // become a friendly message. The email never lands in the URL.
      if (err instanceof AuthError) {
        const errCode = (err as { code?: string }).code ?? "1";
        redirect(`/login?error=${encodeURIComponent(errCode)}`);
      }
      throw err;
    }
  }

  return (
    <main className="survey-grid mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <p className="lab-label">Private preview</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Spatial<span className="text-accent">Lab</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        This site is not public yet. Sign in to continue.
      </p>
      <form action={login} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="lab-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 min-h-12 w-full border border-line bg-surface px-4 text-[15px] focus:border-line-strong focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="lab-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 min-h-12 w-full border border-line bg-surface px-4 text-[15px] focus:border-line-strong focus:outline-none"
          />
        </div>
        {reason && (
          <p className="text-sm text-accent" role="alert">
            Signing in didn&rsquo;t work — check your email and password.
          </p>
        )}
        <button
          type="submit"
          className="mt-2 min-h-12 w-full bg-accent px-6 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
