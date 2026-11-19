import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { PostEditor } from "@/components/admin/PostEditor";
import { today } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "New post",
};

export default async function NewPostPage() {
  const owner = await requireOwner();
  return (
    <>
      <AdminPageHead title="New post" back={{ href: "/admin/posts", label: "Blog posts" }} />
      <PostEditor
        mode="create"
        slug=""
        initial={{ title: "", date: today(), summary: "", body: "", draft: true }}
        version={null}
        csrf={owner.csrf}
      />
    </>
  );
}
