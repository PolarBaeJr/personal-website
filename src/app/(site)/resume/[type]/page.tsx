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
      <nav aria-label="Résumé versions">
        <ul className="version-tabs">
          {RESUME_TYPES.map((version) => (
            <li key={version}>
              <Link
                href={`/resume/${version}`}
                className="version-tab"
                aria-current={version === type ? "page" : undefined}
              >
                {getVariantMeta(version).label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <h1 className="page-title">{meta.label} résumé</h1>
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
