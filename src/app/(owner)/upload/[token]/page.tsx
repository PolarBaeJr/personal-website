import type { Metadata } from "next";
import { headers } from "next/headers";
import { UploadLinkForm } from "@/components/UploadLinkForm";
import { clientIpFrom } from "@/lib/client-ip";
import { UPLOAD_LINK_CLOSED } from "@/lib/media/limits";
import { checkUploadLink } from "@/lib/media/upload-link";

export const metadata: Metadata = {
  title: "Send a photo",
  referrer: "no-referrer",
};

// A one-time link from Claude for sending one photo, with no sign-in: the
// token is the only authorization. A bad, used or expired link shows the
// same line and nothing else.
export default async function UploadLinkPage({ params }: PageProps<"/upload/[token]">) {
  const { token } = await params;
  const check = checkUploadLink(token, clientIpFrom(await headers()));

  return (
    <main className="admin-login">
      <h1 className="admin-title">Send a photo</h1>
      {check.kind === "open" ? (
        <>
          {check.note && <p className="upload-link-note">Claude asked for: {check.note}</p>}
          <UploadLinkForm token={token} />
        </>
      ) : check.kind === "throttled" ? (
        <p>Too many tries. Wait 15 minutes, then try again.</p>
      ) : (
        <p>{UPLOAD_LINK_CLOSED}</p>
      )}
    </main>
  );
}
