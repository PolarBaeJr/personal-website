import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPostSlugs } from "@/lib/posts";

export function generateStaticParams() {
  const params = getPostSlugs().map((slug) => ({ slug }));
  // Must return at least one entry with Cache Components; the placeholder 404s.
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.summary };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="flow">
      <p>
        <Link href="/blog">← All posts</Link>
      </p>
      <h1>{post.title}</h1>
      <time dateTime={post.date} className="text-muted">
        {post.date}
      </time>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
