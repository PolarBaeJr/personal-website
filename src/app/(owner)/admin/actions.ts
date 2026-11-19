"use server";

import { redirect } from "next/navigation";
import { ensureContentSeeded } from "@/lib/content-data";
import { isSectionName } from "@/lib/content-store/schema";
import { SIGNED_OUT, type FormState } from "@/lib/admin/form-state";
import { checkOwner } from "@/lib/owner";
import { ensureSeeded } from "@/lib/resume-data";
import { isResumeType } from "@/lib/resume-types";
import { restoreSection, saveSection } from "@/lib/write/content";
import {
  createPost,
  deletePost,
  previewPost,
  restorePost,
  updatePost,
} from "@/lib/write/posts";
import { regenerateResume, restoreResume } from "@/lib/write/resume";
import type { WriteResult } from "@/lib/write/result";

// Every action checks the session and the form's CSRF token itself, then
// calls the same write functions as the API, with actor "admin".

const MAX_NOTE_CHARS = 500;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function note(formData: FormData): string {
  return text(formData, "note").trim().slice(0, MAX_NOTE_CHARS);
}

function positiveInt(value: string): number | undefined {
  return /^[1-9]\d{0,8}$/.test(value) ? Number(value) : undefined;
}

function parseData(formData: FormData): unknown {
  try {
    return JSON.parse(text(formData, "data"));
  } catch {
    return undefined;
  }
}

const ERRORS: Record<string, string> = {
  "changed elsewhere": "This was changed somewhere else. Reload to get the latest.",
  invalid_content: "Some fields need fixing. Look for the messages in red.",
  version_not_found: "That version doesn't exist any more.",
  post_exists: "There's already a post at that web address. Pick another one.",
  post_not_found: "This post was deleted somewhere else. Reload to check.",
  compile_failed: "The PDF couldn't be built, so nothing was changed.",
  "imported PDFs cannot become current":
    "That version is an uploaded PDF without its source, so it can't be made current.",
};

function toState<T>(result: WriteResult<T>, okMessage: string, version?: (v: T) => number): FormState {
  if (result.ok) {
    return { ok: true, message: okMessage, version: version?.(result.version) };
  }
  return {
    ok: false,
    message: ERRORS[result.error] ?? "Something went wrong, so nothing was saved.",
    issues: result.issues,
  };
}

function failed(where: string, e: unknown): FormState {
  console.error(`admin ${where}: ${(e as Error).message}`);
  return { ok: false, message: "Something went wrong, so nothing was saved." };
}

export async function saveSectionAction(formData: FormData): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const section = text(formData, "section");
  if (!isSectionName(section)) return { ok: false, message: "Unknown section." };
  const data = parseData(formData);
  if (data === undefined) return { ok: false, message: "The form sent nothing to save." };
  try {
    ensureContentSeeded();
    const result = saveSection(
      section,
      data,
      note(formData),
      "admin",
      positiveInt(text(formData, "baseVersion")),
    );
    return toState(result, "Saved. It's live on the site.", (v) => v.version);
  } catch (e) {
    return failed("save section", e);
  }
}

// From the history pages. Redirects back to the editor on success.
export async function restoreSectionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const section = text(formData, "section");
  const version = positiveInt(text(formData, "version"));
  if (!isSectionName(section) || !version) return { ok: false, message: "Unknown version." };
  let state: FormState;
  try {
    ensureContentSeeded();
    state = toState(restoreSection(section, version, "", "admin"), "Restored.");
  } catch (e) {
    return failed("restore section", e);
  }
  if (!state.ok) return state;
  redirect(`/admin/${section}/history`);
}

// Creates a post (no baseVersion) or updates one.
export async function savePostAction(formData: FormData): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const slug = text(formData, "slug");
  const data = parseData(formData);
  if (data === undefined) return { ok: false, message: "The form sent nothing to save." };
  const saved =
    typeof data === "object" && data !== null && "draft" in data && data.draft === true
      ? "Saved. Only you can see it while it's a draft."
      : "Saved. It's live on the site.";
  try {
    ensureContentSeeded();
    if (formData.get("mode") === "create") {
      return toState(createPost(slug, data, note(formData), "admin"), saved, (v) => v.version);
    }
    const result = updatePost(
      slug,
      data,
      note(formData),
      "admin",
      positiveInt(text(formData, "baseVersion")),
    );
    return toState(result, saved, (v) => v.version);
  } catch (e) {
    return failed("save post", e);
  }
}

export async function deletePostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  let state: FormState;
  try {
    ensureContentSeeded();
    state = toState(deletePost(text(formData, "slug")), "Deleted.");
  } catch (e) {
    return failed("delete post", e);
  }
  if (!state.ok) return state;
  redirect("/admin/posts");
}

export async function restorePostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const slug = text(formData, "slug");
  const version = positiveInt(text(formData, "version"));
  if (!version) return { ok: false, message: "Unknown version." };
  let state: FormState;
  try {
    ensureContentSeeded();
    state = toState(restorePost(slug, version, "", "admin"), "Restored.");
  } catch (e) {
    return failed("restore post", e);
  }
  if (!state.ok) return state;
  redirect(`/admin/posts/${slug}`);
}

// Renders the body the same way the blog does, without saving.
export async function previewPostAction(
  csrf: string,
  body: string,
): Promise<{ html: string } | { error: string }> {
  if (!(await checkOwner(csrf))) return { error: SIGNED_OUT };
  if (typeof body !== "string" || body.length > 200 * 1024) {
    return { error: "This post is too long to preview." };
  }
  return previewPost(body);
}

export async function restoreResumeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const type = text(formData, "type");
  const version = positiveInt(text(formData, "version"));
  if (!isResumeType(type) || !version) return { ok: false, message: "Unknown version." };
  let state: FormState;
  try {
    await ensureSeeded();
    state = toState(await restoreResume(type, version, ""), "Done.");
  } catch (e) {
    return failed("restore resume", e);
  }
  if (!state.ok) return state;
  redirect(`/admin/resume/${type}`);
}

export async function rebuildResumeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await checkOwner(formData.get("csrf")))) return { ok: false, message: SIGNED_OUT };
  const type = text(formData, "type");
  if (!isResumeType(type)) return { ok: false, message: "Unknown résumé." };
  try {
    await ensureSeeded();
    return toState(await regenerateResume(type), "PDF rebuilt.");
  } catch (e) {
    return failed("rebuild resume", e);
  }
}
