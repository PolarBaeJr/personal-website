import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVariantMeta } from "@/lib/resume";
import { isResumeType, RESUME_TYPES } from "@/lib/resume-types";

export function generateStaticParams() {
  return RESUME_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: PageProps<"/resume/[type]/document">): Promise<Metadata> {
  const { type } = await params;
  if (!isResumeType(type)) return {};
  return { title: `${getVariantMeta(type).label} résumé PDF` };
}

// Placeholder. Phase 2 serves the compiled LaTeX PDF for this variant here.
export default async function ResumeDocumentPage({
  params,
}: PageProps<"/resume/[type]/document">) {
  const { type } = await params;
  if (!isResumeType(type)) notFound();
  const meta = getVariantMeta(type);

  return (
    <div className="flow">
      <h1 className="page-title">{meta.label} résumé PDF</h1>
      <p className="lede">PDF coming soon.</p>
      <div className="btn-row">
        <Link href={`/resume/${type}`} className="btn btn--primary">
          View web version
        </Link>
        <Link href="/resume" className="btn btn--outline">
          All versions
        </Link>
      </div>
    </div>
  );
}
