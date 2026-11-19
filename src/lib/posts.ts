import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";
import type { PostData } from "@/lib/content-store/schema";

// content/posts/*.md are seeds (filename = slug); the live posts are in the
// content DB.
const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  draft: boolean;
};

export type Post = PostMeta & { html: string };

export function getSeedPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -".md".length));
}

export function readSeedPost(slug: string): PostData {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));

  let date: string;
  if (typeof data.date === "string") {
    date = data.date;
  } else if (data.date instanceof Date) {
    date = data.date.toISOString().slice(0, 10);
  } else {
    throw new Error(`Invalid or missing "date" in frontmatter of ${file}`);
  }
  if (typeof data.title !== "string") {
    throw new Error(`Invalid or missing "title" in frontmatter of ${file}`);
  }
  if (typeof data.summary !== "string") {
    throw new Error(`Invalid or missing "summary" in frontmatter of ${file}`);
  }

  const post: PostData = { title: data.title, date, summary: data.summary, body: content };
  if (data.draft === true) post.draft = true;
  return post;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// http, https, mailto, relative paths and #anchors. Browsers ignore control
// characters and spaces inside a scheme, so those are dropped before checking.
function safeUrl(href: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href.replace(/[\x00-\x20]/g, ""));
  return !scheme || ["http", "https", "mailto"].includes(scheme[1].toLowerCase());
}

// Raw HTML in a post shows as text instead of becoming markup, and a link or
// image with any other URL scheme shows as its plain text. A renderer that
// returns false hands the token to marked's default renderer.
const markdown = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, tokens }) {
      if (safeUrl(href)) return false;
      return this.parser.parseInline(tokens);
    },
    image({ href, text }) {
      if (safeUrl(href)) return false;
      return escapeHtml(text);
    },
  },
});

export function renderMarkdown(body: string): string {
  return markdown.parse(body, { async: false }) as string;
}
