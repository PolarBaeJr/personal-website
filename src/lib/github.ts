import { cacheLife, cacheTag } from "next/cache";

export type GitHubRepo = {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
};

const REPO_URL =
  /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/;

export function parseGitHubRepo(
  href: string,
): { owner: string; repo: string } | null {
  const match = REPO_URL.exec(href);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export async function getGitHubRepo(
  owner: string,
  repo: string,
): Promise<GitHubRepo | null> {
  "use cache";
  cacheTag("github", `github:${owner}/${repo}`);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "personal-site",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let json: unknown;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    json = await res.json();
  } catch {
    // Cache failures briefly so a GitHub outage or rate limit renders the
    // fallback card without hammering the API, but recovers within 15 min.
    cacheLife({ revalidate: 900 });
    return null;
  }

  const data = (json ?? {}) as Record<string, unknown>;
  const ownerData = (data.owner ?? {}) as Record<string, unknown>;
  // Successful responses change rarely; cache them for longer.
  cacheLife("hours");
  return {
    owner: typeof ownerData.login === "string" ? ownerData.login : owner,
    name: typeof data.name === "string" ? data.name : repo,
    fullName:
      typeof data.full_name === "string" ? data.full_name : `${owner}/${repo}`,
    htmlUrl:
      typeof data.html_url === "string"
        ? data.html_url
        : `https://github.com/${owner}/${repo}`,
    description:
      typeof data.description === "string" && data.description !== ""
        ? data.description
        : null,
    language: typeof data.language === "string" ? data.language : null,
    stars:
      typeof data.stargazers_count === "number" ? data.stargazers_count : 0,
    forks: typeof data.forks_count === "number" ? data.forks_count : 0,
    pushedAt: typeof data.pushed_at === "string" ? data.pushed_at : null,
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

export function formatPushed(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(iso);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `Updated ${month} ${match[1]}`;
}
