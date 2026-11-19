import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditLink } from "@/components/EditLink";
import { Skeleton } from "@/components/Skeleton";
import { getPost } from "@/lib/content";
import { seedPosts } from "@/lib/content-data";
import { postList } from "@/lib/content-view";
import { getOwner } from "@/lib/owner";
import type { Post } from "@/lib/posts";

// The live posts are in the DB; slugs outside the seeds render on demand
// (the proxy has already 404'd unknown ones).
export function generateStaticParams() {
  const params = postList(seedPosts()).map(({ slug }) => ({ slug }));
  // Must return at least one entry with Cache Components; the placeholder 404s.
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  await io();
  const post = await getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.summary };
}

function PostBody({ post }: { post: Post }) {
  return (
    <>
      <h1 className="page-title">
        {post.title}
        {post.draft && <span className="badge-draft">Draft</span>}
      </h1>
      <time dateTime={post.date} className="text-slate">
        {post.date}
      </time>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </>
  );
}

async function LivePostBody({ slug }: { slug: string }) {
  await io();
  const owner = await getOwner();
  const post = await getPost(slug, !!owner);
  // Backstop only: the proxy 404s unknown slugs before rendering starts.
  if (!post) notFound();
  return (
    <>
      <PostBody post={post} />
      <EditLink href={`/admin/posts/${slug}`} label="Edit this post" />
    </>
  );
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;

  return (
    <article className="flow">
      <p>
        <Link href="/blog" className="text-link">
          All posts
        </Link>
      </p>
      <Suspense fallback={<Skeleton lines={8} />}>
        <LivePostBody slug={slug} />
      </Suspense>
    </article>
  );
}
