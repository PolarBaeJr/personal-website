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
        <p className="lede">Debits ≠ Credits. This page doesn&apos;t exist.</p>
        <div className="taccount taccount--compact">
          <h2 className="taccount-label taccount-label--accounting">Debits</h2>
          <h2 className="taccount-label taccount-label--building">Credits</h2>
          <div className="taccount-hr taccount-static" aria-hidden="true" />
          <ul className="taccount-col taccount-col--accounting">
            <li className="taccount-entry">
              <span>Page requested</span>
              <span className="num">1.00</span>
            </li>
          </ul>
          <ul className="taccount-col taccount-col--building">
            <li className="taccount-entry">
              <span>Page delivered</span>
              <span className="num">0.00</span>
            </li>
            <li className="taccount-entry">
              <span>Apology</span>
              <span className="num">0.50</span>
            </li>
          </ul>
          <div className="taccount-vr taccount-static" aria-hidden="true" />
          <div className="taccount-total taccount-total--split">
            <p className="taccount-total-cell taccount-total-cell--debit">
              <span className="taccount-total-label">Total debits</span>
              <span className="taccount-total-value">1.00</span>
            </p>
            <p className="taccount-total-cell taccount-total-cell--credit">
              <span className="taccount-total-label">Total credits</span>
              <span className="taccount-total-value">0.50</span>
            </p>
          </div>
        </div>
        <p>
          <Link href="/" className="text-link">
            Go home
          </Link>
        </p>
      </main>
    </>
  );
}
