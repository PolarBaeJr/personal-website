// Where to go after signing in. Only paths on this site: starts with one
// "/", no "//" or backslash (browsers treat both as another host).
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/admin";
  }
  if (/[\x00-\x20]/.test(value)) return "/admin";
  return value;
}
