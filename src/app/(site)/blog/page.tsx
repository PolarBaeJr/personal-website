import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { EditLink } from "@/components/EditLink";
import { Skeleton } from "@/components/Skeleton";
import { getAllPosts } from "@/lib/content";
import { getOwner } from "@/lib/owner";
import type { PostMeta } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
};

function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) return <p className="text-slate">No posts yet.</p>;
  return (
    <ul className="row-list">
      {posts.map((post) => (
        <li key={post.slug} className="row">
          <h2 className="row-title">
            <Link href={`/blog/${post.slug}`} className="row-title-link">
              {post.title}
            </Link>
            {post.draft && <span className="badge-draft">Draft</span>}
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
  );
}

async function LivePostList() {
  await io();
  const owner = await getOwner();
  return <PostList posts={await getAllPosts(!!owner)} />;
}

export default function BlogPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Blog</h1>
      <EditLink href="/admin/posts" label="Edit posts" />
      <Suspense fallback={<Skeleton lines={3} />}>
        <LivePostList />
      </Suspense>
    </div>
  );
}
