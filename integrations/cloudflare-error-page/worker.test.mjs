// Run: node --test integrations/cloudflare-error-page
// The HTML import is swapped for a stub so the logic runs under plain node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const src = (await readFile(new URL("./worker.js", import.meta.url), "utf8"))
  .replace(/^import page from .*$/m, 'const page = "<p>down</p><!--REF-->";');
const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`);

const nav = (url = "https://matthewcheng.net/") =>
  new Request(url, { headers: { accept: "text/html", "sec-fetch-mode": "navigate" } });
const reply = (status, body = "", headers = {}) => async () => new Response(body, { status, headers });

test("passes healthy navigations through", async () => {
  const r = await mod.handle(nav(), reply(200, "ok"));
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "ok");
});

test("brands gateway failures and keeps the status", async () => {
  for (const status of [502, 504, 522, 530]) {
    const r = await mod.handle(nav(), reply(status, "", { "cf-ray": "abc<1>" }));
    assert.equal(r.status, status);
    const body = await r.text();
    assert.match(body, /down/);
    assert.match(body, /Reference abc&lt;1&gt;/);
  }
});

test("brands the proxy's generic 503 only", async () => {
  const generic = await mod.handle(nav(), reply(503, "Service unavailable at this time, try again later."));
  assert.match(await generic.text(), /down/);
  const maintenance = await mod.handle(nav(), reply(503, "<h1>Closed for month-end.</h1>"));
  assert.equal(maintenance.status, 503);
  assert.match(await maintenance.text(), /month-end/);
});

test("never touches non-navigation requests", async () => {
  const api = new Request("https://matthewcheng.net/api/resume", { headers: { accept: "application/json" } });
  const r = await mod.handle(api, reply(502, "raw"));
  assert.equal(await r.text(), "raw");
});

test("an unreachable origin becomes a branded 502", async () => {
  const r = await mod.handle(nav(), async () => { throw new Error("boom"); });
  assert.equal(r.status, 502);
});
