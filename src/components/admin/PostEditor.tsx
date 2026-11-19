"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorForm } from "@/components/admin/EditorForm";
import { Switch, TextArea, TextField } from "@/components/admin/Fields";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { previewPostAction, savePostAction } from "@/app/(owner)/admin/actions";
import type { PostData } from "@/lib/content-store/schema";

function serialize(post: PostData): PostData {
  return {
    title: post.title.trim(),
    date: post.date,
    summary: post.summary.trim(),
    body: post.body,
    ...(post.draft ? { draft: true } : {}),
  };
}

export function PostEditor({
  mode,
  slug: initialSlug,
  initial,
  version,
  csrf,
}: {
  mode: "create" | "edit";
  slug: string;
  initial: PostData;
  version: number | null;
  csrf: string;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const form = useSaveForm({
    initial,
    version,
    serialize,
    action: savePostAction,
    onSaved:
      mode === "create"
        ? (formData) => router.push(`/admin/posts/${String(formData.get("slug"))}`)
        : undefined,
  });
  const { data, setData } = form;
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<{ html: string } | { error: string } | null>(null);
  const [previewing, startPreview] = useTransition();

  function showPreview() {
    setTab("preview");
    startPreview(async () => {
      try {
        setPreview(await previewPostAction(csrf, data.body));
      } catch {
        setPreview({ error: "The preview didn't load. Check your connection and try again." });
      }
    });
  }

  return (
    <EditorForm
      form={form}
      csrf={csrf}
      hidden={{ mode, slug }}
      saveLabel={mode === "create" ? "Create post" : "Save"}
    >
      <section className="admin-fieldset" aria-label="Post details">
        <TextField
          label="Title"
          path="title"
          value={data.title}
          onChange={(title) => setData({ ...data, title })}
        />
        {mode === "create" ? (
          <TextField
            label="Web address"
            hint={`The post will be at /blog/${slug || "your-post"}. Lowercase words joined by hyphens. It can't be changed later.`}
            path="slug"
            value={slug}
            onChange={setSlug}
          />
        ) : (
          <p className="admin-hint">The post is at /blog/{slug}.</p>
        )}
        <TextField
          label="Date"
          type="date"
          path="date"
          value={data.date}
          onChange={(date) => setData({ ...data, date })}
        />
        <TextField
          label="One-line summary"
          hint="Shown on the blog list."
          path="summary"
          value={data.summary}
          onChange={(summary) => setData({ ...data, summary })}
        />
        <Switch
          label="Still a draft (only you can see it)"
          checked={data.draft === true}
          onChange={(draft) => setData({ ...data, draft })}
        />
      </section>

      <section className="admin-fieldset" aria-label="Post text">
        <div className="admin-tabs" role="tablist" aria-label="Post text">
          <button
            type="button"
            role="tab"
            className="admin-tab"
            aria-selected={tab === "write"}
            onClick={() => setTab("write")}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            className="admin-tab"
            aria-selected={tab === "preview"}
            onClick={showPreview}
          >
            Preview
          </button>
        </div>
        {tab === "write" ? (
          <TextArea
            label="Post text"
            hint="Markdown: a blank line between paragraphs, ## for a heading, **bold**, [link text](https://…)."
            path="body"
            value={data.body}
            rows={18}
            className="admin-textarea--body"
            onChange={(body) => setData({ ...data, body })}
          />
        ) : previewing || !preview ? (
          <p className="admin-muted">Loading preview…</p>
        ) : "error" in preview ? (
          <p className="admin-error">{preview.error}</p>
        ) : (
          <article className="flow">
            <h2 className="page-title">{data.title || "Untitled"}</h2>
            <time dateTime={data.date} className="text-slate">
              {data.date}
            </time>
            <div className="prose" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </article>
        )}
      </section>
    </EditorForm>
  );
}
