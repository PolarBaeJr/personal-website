import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import {
  CertificationsSection,
  ClubsSection,
  CompetitionsSection,
  HobbiesSection,
} from "@/components/AboutSections";
import { EditLink } from "@/components/EditLink";
import { Skeleton } from "@/components/Skeleton";
import { getSite } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
};

function Paragraphs({ about }: { about: string[] }) {
  return about.map((p) => (
    <p key={p} className="measure">
      {p}
    </p>
  ));
}

async function LiveParagraphs() {
  await io();
  return <Paragraphs about={(await getSite()).about} />;
}

export default function AboutPage() {
  return (
    <div className="stack">
      <section className="flow">
        <h1 className="page-title">About</h1>
        <EditLink href="/admin/site#edit-about" label="Edit about text" />
        <Suspense fallback={<Skeleton lines={4} />}>
          <LiveParagraphs />
        </Suspense>
      </section>
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
