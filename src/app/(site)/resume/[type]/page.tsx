import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumeSections } from "@/components/ResumeSections";
import { getVariantMeta } from "@/lib/resume";
import { isResumeType, RESUME_TYPES } from "@/lib/resume-types";

export function generateStaticParams() {
  return RESUME_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: PageProps<"/resume/[type]">): Promise<Metadata> {
  const { type } = await params;
  if (!isResumeType(type)) return {};
  return { title: `${getVariantMeta(type).label} résumé` };
}

export default async function ResumeVariantPage({
  params,
}: PageProps<"/resume/[type]">) {
  const { type } = await params;
  if (!isResumeType(type)) notFound();
  const meta = getVariantMeta(type);

  return (
    <div className="flow">
      <h1 className="page-title">{meta.label} résumé</h1>
      <p className="back-row">
        <Link href="/resume" className="back-link">
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path
              d="M7.5 2.5 4 6l3.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to all résumés
        </Link>
      </p>
      {meta.summary && <p className="lede">{meta.summary}</p>}
      <div className="btn-row">
        <a href={`/resume/${type}/document`} className="btn btn--outline">
          Download PDF
        </a>
      </div>
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <ResumeSections type={type} />
      </Suspense>
    </div>
  );
}
