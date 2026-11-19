import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { safeNextPath } from "@/lib/admin/next-path";
import { getOwner, signInEnabled } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  if (await getOwner()) redirect(next);

  return (
    <main className="admin-login">
      <h1 className="admin-title">Sign in</h1>
      {signInEnabled() ? (
        <LoginForm next={next} />
      ) : (
        <p className="admin-muted">
          Sign-in isn&apos;t set up. Set OWNER_PASSWORD_HASH on the server and
          restart it (the README explains how).
        </p>
      )}
      <p>
        <Link href="/" className="text-link">
          Back to the site
        </Link>
      </p>
    </main>
  );
}
