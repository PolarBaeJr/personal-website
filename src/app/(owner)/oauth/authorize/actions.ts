"use server";

import { redirect } from "next/navigation";
import { insertCode } from "@/lib/content-store/oauth";
import { checkAuthorizeRequest, errorRedirect } from "@/lib/oauth/authorize";
import { newSecret, oauthDb, ownerTag, sha256 } from "@/lib/oauth/core";
import { checkOwner } from "@/lib/owner";

// Allow or Deny on the consent page. Checks the session and CSRF token,
// then the request again, and sends the browser back to the app.
export async function decideAuthorization(formData: FormData): Promise<void> {
  const qs = new URLSearchParams();
  for (const [key, value] of formData) {
    // "$" keys are Next's hidden Server Action fields ($ACTION_ID_...).
    if (key === "csrf" || key === "decision" || key.startsWith("$")) continue;
    if (typeof value === "string") qs.append(key, value);
  }

  if (!(await checkOwner(formData.get("csrf")))) {
    redirect("/login?next=" + encodeURIComponent("/oauth/authorize?" + qs));
  }

  const check = checkAuthorizeRequest(qs);
  if (check.kind === "fatal" || check.kind === "off") redirect("/oauth/authorize?" + qs);
  if (check.kind === "redirect") redirect(check.url);

  if (formData.get("decision") !== "allow") {
    redirect(errorRedirect(check.redirectUri, "access_denied", "The owner said no", check.state));
  }

  const tag = ownerTag();
  if (!tag) redirect("/oauth/authorize?" + qs);
  const code = newSecret("mcc_");
  let saved = false;
  try {
    insertCode(oauthDb(), {
      hash: sha256(code),
      clientId: check.client.id,
      redirectUri: check.redirectUri,
      challenge: check.challenge,
      resource: check.resource,
      ownerTag: tag,
    });
    saved = true;
  } catch (e) {
    console.error(`oauth consent: ${(e as Error).message}`);
  }
  if (!saved) {
    redirect(errorRedirect(check.redirectUri, "server_error", "Something went wrong", check.state));
  }

  const url = new URL(check.redirectUri);
  url.searchParams.set("code", code);
  if (check.state) url.searchParams.set("state", check.state);
  redirect(url.href);
}
