import { Suspense } from "react";
import type { Metadata } from "next";
import {
  CertificationsSection,
  ClubsSection,
  CompetitionsSection,
  HobbiesSection,
} from "@/components/AboutSections";
import { Skeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Other involvements",
};

export default function AboutPage() {
  return (
    <div className="stack">
      <h1 className="page-title">Other involvements</h1>
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <CompetitionsSection />
        <CertificationsSection />
      </Suspense>
      <Suspense fallback={<Skeleton lines={5} />}>
        <ClubsSection />
      </Suspense>
      <Suspense fallback={null}>
        <HobbiesSection />
      </Suspense>
    </div>
  );
}
