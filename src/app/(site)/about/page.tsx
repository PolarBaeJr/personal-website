import { Suspense } from "react";
import type { Metadata } from "next";
import {
  CertificationsSection,
  ClubsSection,
  CompetitionsSection,
  HobbiesSection,
} from "@/components/AboutSections";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="stack">
      <section className="flow">
        <h1 className="page-title">About</h1>
        {site.about.map((p) => (
          <p key={p} className="measure">
            {p}
          </p>
        ))}
      </section>
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <CompetitionsSection />
        <CertificationsSection />
      </Suspense>
      <ClubsSection />
      <HobbiesSection />
    </div>
  );
}
