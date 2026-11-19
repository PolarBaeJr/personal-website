import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Playground",
};

// Add experiments as src/app/(site)/playground/<name>/page.tsx
export default function PlaygroundPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Playground</h1>
      <ul className="row-list">
        <li className="row">
          <h2 className="row-title">
            <Link href="/playground/journal-entries" className="row-title-link">
              Journal entry trainer
            </Link>
          </h2>
          <div className="row-aside">
            <span className="pill pill--cobalt">Accounting</span>
          </div>
          <p className="row-summary">
            Practise debits and credits on 22 transactions for a small bike
            shop, from basic entries to year-end adjustments.
          </p>
        </li>
      </ul>
    </div>
  );
}
