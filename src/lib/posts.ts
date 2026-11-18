import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
};

export type Post = PostMeta & { html: string };

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -".md".length));
}

function readPostFile(slug: string): { meta: PostMeta; content: string } {
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

  return {
    meta: { slug, title: data.title, date, summary: data.summary },
    content,
  };
}

export function getAllPosts(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => readPostFile(slug).meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  if (!getPostSlugs().includes(slug)) return undefined;
  const { meta, content } = readPostFile(slug);
  // marked does not sanitise HTML. Fine here: only the site owner writes posts.
  const html = marked.parse(content, { async: false }) as string;
  return { ...meta, html };
}
