import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Not found",
};

// Renders inside the root layout only, so it brings its own header and main.
export default function NotFound() {
  return (
    <>
      <header className="bare-header site-width">
        <Link href="/" className="site-brand">
          {site.name}
        </Link>
      </header>
      <main className="site-main site-width flow">
        <h1 className="page-title">Not found</h1>
        <p className="lede">That page doesn&apos;t exist.</p>
        <p>
          <Link href="/" className="text-link">
            Go home
          </Link>
        </p>
      </main>
    </>
  );
}
