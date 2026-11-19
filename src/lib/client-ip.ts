// Cloudflare's header first, then the first proxy hop.
export function clientIpFrom(h: Headers): string {
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
