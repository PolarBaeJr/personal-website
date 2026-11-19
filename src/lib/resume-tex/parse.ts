// Pure parser for the résumé .tex files (Jake's Resume template). Imports
// nothing, so plain node can run it too. Phone and address are stripped in the
// privacy pass and never reach the output.

export type ParsedEntry = {
  a: string;
  b: string;
  c: string;
  d: string;
  bullets: string[];
};
export type ParsedProject = {
  title: string;
  subtitle?: string;
  dates: string;
  bullets: string[];
};
export type ParsedSection =
  | { title: string; kind: "entries"; entries: ParsedEntry[] }
  | { title: string; kind: "projects"; projects: ParsedProject[] }
  | { title: string; kind: "skills"; lines: { label: string; text: string }[] }
  | { title: string; kind: "items"; items: string[] };
export type ParsedTex = { name: string; sections: ParsedSection[] };

// Reads the next `n` balanced {…} groups from `i`, skipping whitespace between
// them. Returns null when a group is missing.
function readArgs(
  src: string,
  i: number,
  n: number,
): { args: string[]; end: number } | null {
  const args: string[] = [];
  let pos = i;
  for (let k = 0; k < n; k++) {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (src[pos] !== "{") return null;
    let depth = 0;
    const start = pos;
    for (; pos < src.length; pos++) {
      const ch = src[pos];
      if (ch === "\\") {
        pos++;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) return null;
    args.push(src.slice(start + 1, pos));
    pos++;
  }
  return { args, end: pos };
}

// Replaces every `\name{…}…` (with `n` args) using `fn`.
function replaceCommand(
  src: string,
  name: string,
  n: number,
  fn: (args: string[]) => string,
): string {
  const re = new RegExp(`\\\\${name}(?![a-zA-Z])`, "g");
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const read = readArgs(src, m.index + m[0].length, n);
    if (!read) continue;
    out += src.slice(last, m.index) + fn(read.args);
    last = read.end;
    re.lastIndex = read.end;
  }
  return out + src.slice(last);
}

const ESCAPES: Record<string, string> = {
  "&": "\uE001",
  "%": "\uE002",
  $: "\uE003",
  "#": "\uE004",
  _: "\uE005",
  "{": "\uE006",
  "}": "\uE007",
};
const UNESCAPES: Record<string, string> = Object.fromEntries(
  Object.entries(ESCAPES).map(([k, v]) => [v, k]),
);

export function texToText(fragment: string): string {
  // Protect escaped specials first so `\$21.7M ... \$65M` never pairs as math.
  let s = fragment.replace(/\\([&%$#_{}])/g, (_, ch: string) => ESCAPES[ch]);
  s = replaceCommand(s, "href", 2, (args) => args[1]);
  s = s
    .replace(/\$\|\$/g, "|")
    .replace(/\$\\sim\$/g, "~")
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\\\\(\[[^\]]*\])?/g, " ")
    .replace(/\\[vh]space\*?\{[^}]*\}/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\[a-zA-Z]+\*?/g, "")
    .replace(/~/g, " ")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/``/g, "“")
    .replace(/''/g, "”")
    .replace(/[{}]/g, "")
    .replace(/[\uE001-\uE007]/g, (ch) => UNESCAPES[ch]);
  return s.replace(/\s+/g, " ").trim();
}

export function looksLikeDateRange(s: string): boolean {
  return /\b(?:19|20)\d{2}\b/.test(s) || /\b(?:present|current)\b/i.test(s);
}

export function splitDates(s: string): { start?: string; end?: string } {
  const text = s.trim();
  if (!text) return {};
  const [start, end] = text.split(/\s*[–—]\s*|\s+-+\s+/);
  const open = !end || /^(?:present|current)$/i.test(end.trim());
  return { start: start.trim(), end: open ? undefined : end.trim() };
}

// Resolves `\ifpublic X\else Y\fi` and `\ifpublic X\fi` to X.
function resolveIfPublic(src: string): string {
  let s = src;
  for (;;) {
    const at = s.search(/\\ifpublic(?![a-zA-Z])/);
    if (at < 0) return s;
    const re = /\\(if[a-zA-Z]*|else|fi)(?![a-zA-Z])/g;
    re.lastIndex = at + "\\ifpublic".length;
    let depth = 0;
    let elseAt = -1;
    let fiAt = -1;
    let fiLen = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m[1] === "fi") {
        if (depth === 0) {
          fiAt = m.index;
          fiLen = m[0].length;
          break;
        }
        depth--;
      } else if (m[1] === "else") {
        if (depth === 0 && elseAt < 0) elseAt = m.index;
      } else {
        depth++;
      }
    }
    const thenStart = at + "\\ifpublic".length;
    if (fiAt < 0) return s.slice(0, at) + s.slice(thenStart);
    const thenPart = s.slice(thenStart, elseAt >= 0 ? elseAt : fiAt);
    s = s.slice(0, at) + thenPart + s.slice(fiAt + fiLen);
  }
}

const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

function privacyPass(body: string): string {
  let s = resolveIfPublic(body);
  s = s.replace(/\\(?:resumephone|resumeaddress)(?![a-zA-Z])(\s*\{\})?/g, "");
  s = replaceCommand(s, "href", 2, (args) =>
    /^\s*tel:/i.test(args[0]) ? "" : `\\href{${args[0]}}{${args[1]}}`,
  );
  s = s.replace(
    /\\begin\{center\}[\s\S]*?\\end\{center\}/,
    (block) => block.replace(PHONE_RE, ""),
  );
  return s;
}

function parseName(body: string): string {
  const center = body.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  if (!center) return "";
  const at = center[1].search(/\\textbf(?![a-zA-Z])/);
  if (at < 0) return "";
  const read = readArgs(center[1], at + "\\textbf".length, 1);
  return read ? texToText(read.args[0]) : "";
}

type Token =
  | { t: "entry"; entry: ParsedEntry }
  | { t: "project"; project: ParsedProject }
  | { t: "item"; text: string }
  | { t: "skill"; label: string; text: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /\\([a-zA-Z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const after = m.index + m[0].length;
    const name = m[1];
    if (name === "resumeSubheading" || name === "resumeSubSubheading") {
      const n = name === "resumeSubheading" ? 4 : 2;
      const read = readArgs(src, after, n);
      if (!read) continue;
      const [a, b, c = "", d = ""] = read.args.map(texToText);
      tokens.push({ t: "entry", entry: { a, b, c, d, bullets: [] } });
      re.lastIndex = read.end;
    } else if (name === "resumeProjectHeading") {
      const read = readArgs(src, after, 2);
      if (!read) continue;
      const [head, dates] = read.args;
      const [title, ...rest] = head.split("$|$");
      const subtitle = texToText(rest.join(" "));
      tokens.push({
        t: "project",
        project: {
          title: texToText(title),
          subtitle: subtitle || undefined,
          dates: texToText(dates),
          bullets: [],
        },
      });
      re.lastIndex = read.end;
    } else if (name === "resumeItem" || name === "resumeSubItem") {
      const read = readArgs(src, after, 1);
      if (!read) continue;
      const text = texToText(read.args[0]);
      if (text) tokens.push({ t: "item", text });
      re.lastIndex = read.end;
    } else if (name === "textbf") {
      const read = readArgs(src, after, 2);
      if (!read || !read.args[1].trimStart().startsWith(":")) continue;
      tokens.push({
        t: "skill",
        label: texToText(read.args[0]),
        text: texToText(read.args[1]).replace(/^:\s*/, ""),
      });
      re.lastIndex = read.end;
    }
  }
  return tokens;
}

function buildSection(title: string, src: string): ParsedSection {
  const entries: ParsedEntry[] = [];
  const projects: ParsedProject[] = [];
  const lines: { label: string; text: string }[] = [];
  const items: string[] = [];
  let lastBullets: string[] | undefined;
  for (const token of tokenize(src)) {
    if (token.t === "entry") {
      entries.push(token.entry);
      lastBullets = token.entry.bullets;
    } else if (token.t === "project") {
      projects.push(token.project);
      lastBullets = token.project.bullets;
    } else if (token.t === "item") {
      (lastBullets ?? items).push(token.text);
    } else {
      lines.push({ label: token.label, text: token.text });
    }
  }
  if (entries.length > 0) return { title, kind: "entries", entries };
  if (projects.length > 0) return { title, kind: "projects", projects };
  if (lines.length > 0) return { title, kind: "skills", lines };
  return { title, kind: "items", items };
}

export function parseResumeTex(tex: string): ParsedTex {
  const src = (tex ?? "").replace(/(?<!\\)%.*$/gm, "");
  const begin = src.indexOf("\\begin{document}");
  if (begin < 0) return { name: "", sections: [] };
  const endAt = src.indexOf("\\end{document}", begin);
  const body = privacyPass(
    src.slice(begin + "\\begin{document}".length, endAt < 0 ? undefined : endAt),
  );

  const sections: ParsedSection[] = [];
  const re = /\\section\*?(?![a-zA-Z])/g;
  const heads: { title: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const read = readArgs(body, m.index + m[0].length, 1);
    if (!read) continue;
    heads.push({ title: texToText(read.args[0]), start: m.index, end: read.end });
    re.lastIndex = read.end;
  }
  heads.forEach((head, i) => {
    const next = heads[i + 1]?.start ?? body.length;
    sections.push(buildSection(head.title, body.slice(head.end, next)));
  });

  return { name: parseName(body), sections };
}
