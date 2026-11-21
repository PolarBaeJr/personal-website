"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadButton, UploadStatus, useImageUpload } from "@/components/admin/ImageField";

// "Upload photo" on the Photos page: adds to the library without putting
// the photo anywhere, then reloads the list.
export function PhotoLibraryUpload({ csrf }: { csrf: string }) {
  const router = useRouter();
  const { state, upload } = useImageUpload(csrf);
  const [added, setAdded] = useState(false);

  async function onFile(file: File) {
    setAdded(false);
    const done = await upload(file);
    if (!done) return;
    setAdded(true);
    router.refresh();
  }

  return (
    <div className="admin-field">
      <div className="admin-image-actions">
        <UploadButton label="Upload photo" state={state} onFile={onFile} />
      </div>
      <UploadStatus state={state} />
      {added && state.kind === "idle" && <p className="admin-muted">Added to your photos.</p>}
    </div>
  );
}
