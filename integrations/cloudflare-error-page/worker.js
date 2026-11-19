// Cloudflare Worker that shows the site's own 503 page when the origin fails.
//
// Every request is forwarded untouched. Only a browser navigation that comes
// back as a gateway failure (Pi off, tunnel down, container dead) gets the
// branded page. API calls and PDF/asset fetches keep their real response.
// proxy-manager's maintenance mode already answers 503 with this same page
// (proxy.maintenance label), so a 503 is rebranded only when it is the
// proxy's generic "no healthy backend" page.

import page from "../../public/503.html";

// 502/504 from the origin, Cloudflare's 52x origin errors, and 530 for a
// tunnel with no connector.
const GATEWAY_FAILURES = new Set([502, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);

// The sentence proxy-manager writes on its own 503 page.
const PROXY_UNAVAILABLE = "Service unavailable at this time, try again later.";

export function isNavigation(request) {
  if (request.method !== "GET") return false;
  if (request.headers.get("sec-fetch-mode") === "navigate") return true;
  return (request.headers.get("accept") || "").includes("text/html");
}

export async function handle(request, upstream = fetch) {
  if (!isNavigation(request)) return upstream(request);
  let response;
  try {
    response = await upstream(request);
  } catch {
    return errorPage(502, "");
  }
  const ray = response.headers.get("cf-ray") || "";
  if (GATEWAY_FAILURES.has(response.status)) return errorPage(response.status, ray);
  if (response.status !== 503) return response;
  // Reading the body consumes it, so anything else is rebuilt from the text.
  const body = await response.text();
  if (body.includes(PROXY_UNAVAILABLE)) return errorPage(503, ray);
  return new Response(body, response);
}

const worker = {
  fetch: (request) => handle(request),
};

export default worker;

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The status stays the real one so uptime checks still see the outage.
export function errorPage(status, ray, html = page) {
  const reference = ray ? `<p class="ref">Reference ${escapeHtml(ray)}</p>` : "";
  return new Response(html.replace("<!--REF-->", reference), {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "30",
    },
  });
}
