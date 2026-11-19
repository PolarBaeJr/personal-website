import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { PostEditor } from "@/components/admin/PostEditor";
import { deletePostAction } from "@/app/(owner)/admin/actions";
import { loadPost } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Edit post",
};

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[slug]">) {
  const owner = await requireOwner();
  const { slug } = await params;
  const post = loadPost(slug);
  if (!post) notFound();
  return (
    <>
      <AdminPageHead
        title={post.data.title}
        back={{ href: "/admin/posts", label: "Blog posts" }}
        viewHref={`/blog/${slug}`}
        historyHref={`/admin/posts/${slug}/history`}
      >
        <ConfirmForm
          action={deletePostAction}
          fields={{ csrf: owner.csrf, slug }}
          label="Delete post"
          confirmText="Delete this post? It disappears from the site, but its history stays so you can bring it back."
          confirmLabel="Yes, delete"
          danger
        />
      </AdminPageHead>
      <PostEditor
        mode="edit"
        slug={slug}
        initial={post.data}
        version={post.version}
        csrf={owner.csrf}
      />
    </>
  );
}
