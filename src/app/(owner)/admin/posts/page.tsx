import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { loadDeletedPostSlugs, loadPosts } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Blog posts",
};

export default async function AdminPostsPage() {
  await requireOwner();
  const posts = loadPosts();
  const deleted = loadDeletedPostSlugs();
  return (
    <>
      <AdminPageHead title="Blog posts" viewHref="/blog">
        <Link href="/admin/posts/new" className="btn btn--primary admin-btn">
          New post
        </Link>
      </AdminPageHead>
      {posts.length === 0 ? (
        <p className="admin-muted">No posts yet.</p>
      ) : (
        <ul className="admin-table">
          {posts.map((post) => (
            <li key={post.slug} className="admin-table-row">
              <div className="admin-table-main">
                <span className="admin-table-title">
                  {post.data.title}
                  {post.data.draft && <span className="badge-draft">Draft</span>}
                </span>
                <span className="admin-table-meta">{post.data.date}</span>
              </div>
              <div className="admin-table-actions">
                <Link href={`/admin/posts/${post.slug}`} className="admin-btn">
                  Edit<span className="sr-only"> {post.data.title}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {deleted.length > 0 && (
        <section className="admin-section" aria-labelledby="deleted-title">
          <h2 id="deleted-title">Deleted posts</h2>
          <p className="admin-muted">Their history is kept, so you can bring one back.</p>
          <ul className="admin-table">
            {deleted.map((slug) => (
              <li key={slug} className="admin-table-row">
                <div className="admin-table-main">
                  <span className="admin-table-title">{slug}</span>
                </div>
                <div className="admin-table-actions">
                  <Link href={`/admin/posts/${slug}/history`} className="admin-btn">
                    History<span className="sr-only"> of {slug}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
