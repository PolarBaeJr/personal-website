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
      <h1>Blog</h1>
      {posts.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <ul className="card-list">
          {posts.map((post) => (
            <li key={post.slug} className="card flow">
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <time dateTime={post.date} className="text-muted">
                {post.date}
              </time>
              <p>{post.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
