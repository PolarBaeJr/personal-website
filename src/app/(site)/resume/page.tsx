import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ResumeSections } from "@/components/ResumeSections";
import { getVariantMeta } from "@/lib/resume";
import { RESUME_TYPES } from "@/lib/resume-types";

export const metadata: Metadata = {
  title: "Résumé",
};

export default function ResumePage() {
  return (
    <div className="stack">
      <div className="flow">
        <h1 className="page-title">Résumé</h1>
        <p className="lede">Pick the version that fits.</p>
        <ul className="row-list">
          {RESUME_TYPES.map((type) => {
            const meta = getVariantMeta(type);
            return (
              <li key={type} className="row">
                <h2 className="row-title">{meta.label}</h2>
                <div className="row-aside btn-row">
                  <Link href={`/resume/${type}`} className="btn btn--outline">
                    View
                  </Link>
                  <a
                    href={`/resume/${type}/document`}
                    className="btn btn--outline"
                  >
                    Document
                  </a>
                </div>
                <p className="row-summary">{meta.audience}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <section className="flow">
        <h2>Full résumé</h2>
        <Suspense fallback={<p className="text-slate">Loading…</p>}>
          <ResumeSections type="general" />
        </Suspense>
      </section>
    </div>
  );
}
