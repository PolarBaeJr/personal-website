import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="flow">
      <h1 className="page-title">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-slate">No posts yet.</p>
      ) : (
        <ul className="row-list">
          {posts.map((post) => (
            <li key={post.slug} className="row">
              <h2 className="row-title">
                <Link href={`/blog/${post.slug}`} className="row-title-link">
                  {post.title}
                </Link>
              </h2>
              <div className="row-aside">
                <time dateTime={post.date} className="text-slate">
                  {post.date}
                </time>
              </div>
              <p className="row-summary">{post.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
