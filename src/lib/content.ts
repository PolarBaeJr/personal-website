import { cacheLife, cacheTag } from "next/cache";
import {
  readPostSync,
  readPostsSync,
  readSectionSync,
} from "@/lib/content-data";
import {
  featuredProjects,
  postList,
  socialRows,
  visibleAbout,
  visibleBalance,
  visibleProjects,
  visibleSite,
} from "@/lib/content-view";
import { renderMarkdown, type Post, type PostMeta } from "@/lib/posts";

// Callers must `await io()` first (inside Suspense) so these only run at
// request time and never bake the seeds into the static shell. Writes
// revalidate the matching content:<section> tag.

export async function getSite() {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:site");
  return visibleSite(readSectionSync("site"));
}

export async function getHome(includeDrafts = false) {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:home", "content:projects");
  const home = readSectionSync("home");
  const projects = visibleProjects(readSectionSync("projects"), includeDrafts);
  return { ...home, balance: visibleBalance(home, projects) };
}

export async function getAbout() {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:about");
  return visibleAbout(readSectionSync("about"));
}

export async function getProjects(includeDrafts = false) {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:projects");
  return visibleProjects(readSectionSync("projects"), includeDrafts);
}

export async function getProject(slug: string, includeDrafts = false) {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:projects");
  return visibleProjects(readSectionSync("projects"), includeDrafts).find(
    (p) => p.slug === slug,
  );
}

export async function getFeaturedProjects(includeDrafts = false) {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:home", "content:projects");
  return featuredProjects(
    readSectionSync("home"),
    visibleProjects(readSectionSync("projects"), includeDrafts),
  );
}

export async function getSocials() {
  "use cache";
  cacheLife("max");
  cacheTag("content", "content:socials", "content:site");
  return socialRows(readSectionSync("socials"), readSectionSync("site"));
}

export async function getAllPosts(includeDrafts = false): Promise<PostMeta[]> {
  "use cache";
  cacheLife("max");
  cacheTag("content", "posts");
  return postList(readPostsSync(), includeDrafts);
}

export async function getPost(
  slug: string,
  includeDrafts = false,
): Promise<Post | undefined> {
  "use cache";
  cacheLife("max");
  cacheTag("content", "posts", `post:${slug}`);
  const data = readPostSync(slug);
  if (!data || (data.draft && !includeDrafts)) return undefined;
  return {
    slug,
    title: data.title,
    date: data.date,
    summary: data.summary,
    draft: data.draft === true,
    html: renderMarkdown(data.body),
  };
}
