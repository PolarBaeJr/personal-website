import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { HistoryList } from "@/components/admin/HistoryList";
import { restorePostAction } from "@/app/(owner)/admin/actions";
import { loadHistory, loadVersion } from "@/lib/admin/data";
import { actorLabel, formatWhen } from "@/lib/admin/fields";
import { postSection } from "@/lib/content-data";
import { validatePost } from "@/lib/content-store/schema";
import { renderMarkdown } from "@/lib/posts";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Post history",
};

export default async function PostHistoryPage({
  params,
  searchParams,
}: PageProps<"/admin/posts/[slug]/history">) {
  const owner = await requireOwner();
  const { slug } = await params;
  const versions = loadHistory(postSection(slug));
  if (versions.length === 0) notFound();
  const { v } = await searchParams;
  const viewing =
    typeof v === "string" && /^[1-9]\d{0,8}$/.test(v)
      ? loadVersion(postSection(slug), Number(v))
      : undefined;
  const post = viewing && validatePost(viewing.data);

  return (
    <>
      <AdminPageHead
        title={`History: ${slug}`}
        intro="Every save is kept. Restoring copies an old version into a new live one, and brings back a deleted post."
        back={{ href: "/admin/posts", label: "Blog posts" }}
      />
      {viewing && post?.ok && (
        <section className="admin-section" aria-labelledby="viewing-title">
          <h2 id="viewing-title">
            Version {viewing.meta.versionNo}, {formatWhen(viewing.meta.createdAt)}, by{" "}
            {actorLabel(viewing.meta.actor)}
          </h2>
          <article className="admin-readable flow">
            <h3>
              {post.data.title}
              {post.data.draft && <span className="badge-draft">Draft</span>}
            </h3>
            <p className="admin-muted">
              {post.data.date}. {post.data.summary}
            </p>
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.data.body) }}
            />
          </article>
        </section>
      )}
      <HistoryList
        versions={versions}
        viewHref={(n) => `/admin/posts/${slug}/history?v=${n}`}
        restore={restorePostAction}
        fields={{ csrf: owner.csrf, slug }}
      />
    </>
  );
}
