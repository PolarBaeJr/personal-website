import type { Metadata } from "next";
import Image from "next/image";
import { deletePhotoAction } from "@/app/(owner)/admin/actions";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { ConfirmButtons } from "@/components/admin/ConfirmButtons";
import { PhotoLibraryUpload } from "@/components/admin/PhotoLibraryUpload";
import { formatWhen } from "@/lib/admin/fields";
import { listLibrary } from "@/lib/media/library";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Photos",
};

export default async function PhotosPage() {
  const owner = await requireOwner();
  const photos = await listLibrary();
  return (
    <>
      <AdminPageHead
        title="Photos"
        intro="Every photo you've uploaded, newest first. To put one on the site, use Choose from your photos in an editor. A photo can only be deleted when nothing uses it and no saved version mentions it, so going back in the history never loses a photo."
      />
      <PhotoLibraryUpload csrf={owner.csrf} />
      {photos.length === 0 ? (
        <p className="admin-muted">No photos yet.</p>
      ) : (
        <ul className="admin-photos">
          {photos.map((photo) => (
            <li key={photo.file} className="admin-photo-card">
              <span className="admin-photo-thumb">
                <Image src={photo.src} alt="" fill sizes="16rem" className="admin-image" />
              </span>
              <span className="admin-photo-facts">
                <span>
                  {photo.width} by {photo.height} pixels
                </span>
                <span>Added {formatWhen(photo.created_at)}</span>
                <span className="admin-photo-used">
                  {photo.used_on.length > 0
                    ? `Used on: ${photo.used_on.join(", ")}`
                    : "Not used on the site"}
                </span>
                {photo.used_on.length === 0 && photo.in_history && (
                  <span>Kept, because an earlier saved version uses it.</span>
                )}
              </span>
              {photo.used_on.length === 0 && !photo.in_history && (
                <form action={deletePhotoAction}>
                  <input type="hidden" name="csrf" value={owner.csrf} />
                  <input type="hidden" name="file" value={photo.file} />
                  <ConfirmButtons
                    label="Delete"
                    confirmText="Delete this photo?"
                    confirmLabel="Yes, delete"
                  />
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
