// Fetches an image from a public https URL for upload_image, without
// letting the URL reach this machine, its LAN or any other private address.
// The address check runs in the socket's own DNS lookup, so it applies to
// the address actually connected to (no DNS rebinding), and every redirect
// is checked again. Builtins only: shared by the stdio and remote servers.
import dns from "node:dns";
import https from "node:https";
import net from "node:net";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;
const NOT_ALLOWED = "That address isn't allowed.";

const blocked = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["64:ff9b::", 96],
  ["2002::", 16],
] as const) {
  blocked.addSubnet(address, prefix, "ipv6");
}

function isBlocked(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family !== 6) return true;
  // IPv4-mapped (::ffff:a.b.c.d, or the hex form ::ffff:7f00:1) counts as
  // its IPv4 address.
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (dotted) return blocked.check(dotted[1], "ipv4");
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return blocked.check(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`, "ipv4");
  }
  return blocked.check(address, "ipv6");
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true }, (err, list) => {
    if (err) return callback(err, "");
    if (list.length === 0 || list.some((entry) => isBlocked(entry.address))) {
      return callback(new Error(NOT_ALLOWED), "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function checkUrl(url: URL): void {
  if (url.protocol !== "https:") throw new Error("Only https image URLs work.");
  if (url.username || url.password) throw new Error("Image URLs can't contain a user name or password.");
  if (url.port && url.port !== "443") throw new Error("Image URLs must use the normal https port.");
  // Literals never go through the lookup, so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlocked(host)) throw new Error(NOT_ALLOWED);
}

type Hop = { location: string } | { bytes: Uint8Array };

function getOnce(url: URL, maxBytes: number, signal: AbortSignal): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        // A fresh socket each hop, so a pooled connection never skips safeLookup.
        agent: false,
        headers: { accept: "image/*", "user-agent": "site-image-fetch" },
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.resume();
          const location = res.headers.location;
          if (!location) return reject(new Error("The image URL redirected nowhere."));
          return resolve({ location });
        }
        if (status < 200 || status > 299) {
          res.resume();
          return reject(new Error(`The image URL answered HTTP ${status}.`));
        }
        if (Number(res.headers["content-length"] ?? "0") > maxBytes) {
          res.destroy();
          return reject(new Error("That image is over 15 MB."));
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > maxBytes) {
            req.destroy();
            reject(new Error("That image is over 15 MB."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ bytes: new Uint8Array(Buffer.concat(chunks)) }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function fetchImageFromUrl(raw: string, maxBytes: number): Promise<Uint8Array> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That isn't a valid URL.");
  }
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      checkUrl(url);
      const result = await getOnce(url, maxBytes, signal);
      if ("bytes" in result) return result.bytes;
      url = new URL(result.location, url);
    }
  } catch (e) {
    if (signal.aborted) throw new Error("The image URL took too long to answer.");
    throw e;
  }
  throw new Error("The image URL redirected too many times.");
}
