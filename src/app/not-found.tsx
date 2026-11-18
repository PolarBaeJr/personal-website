import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <div className="flow">
      <h1>Not found</h1>
      <p>That page doesn&apos;t exist.</p>
      <p>
        <Link href="/">Go home</Link>
      </p>
    </div>
  );
}
