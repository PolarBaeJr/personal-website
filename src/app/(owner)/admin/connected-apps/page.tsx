import type { Metadata } from "next";
import { disconnectAllAppsAction, disconnectAppAction } from "@/app/(owner)/admin/actions";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { ConfirmButtons } from "@/components/admin/ConfirmButtons";
import { loadConnectedApps } from "@/lib/admin/data";
import { formatWhen } from "@/lib/admin/fields";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Connected apps",
};

export default async function ConnectedAppsPage() {
  const owner = await requireOwner();
  const apps = loadConnectedApps();
  return (
    <>
      <AdminPageHead
        title="Connected apps"
        intro="Apps you've allowed to edit your site, like the Claude app. Disconnecting one stops it at once; it can be connected again from the app. Changing your password, signing out everywhere or turning sign-in off also disconnects everything."
      />
      {apps.length === 0 ? (
        <p className="admin-muted">Nothing is connected. To connect the Claude app, see the README.</p>
      ) : (
        <ul className="admin-table">
          {apps.map((app) => (
            <li key={app.id} className="admin-table-row">
              <div className="admin-table-main">
                <span className="admin-table-title">{app.name}</span>
                <span className="admin-table-meta">
                  Connected {formatWhen(app.connectedAt)},{" "}
                  {app.lastUsedAt ? `last used ${formatWhen(app.lastUsedAt)}` : "not used yet"}
                </span>
                {app.hosts.length > 0 && <span>Returns to {app.hosts.join(", ")}</span>}
              </div>
              <div className="admin-table-actions">
                <form action={disconnectAppAction}>
                  <input type="hidden" name="csrf" value={owner.csrf} />
                  <input type="hidden" name="client_id" value={app.id} />
                  <ConfirmButtons
                    label="Disconnect"
                    confirmText={"Disconnect " + app.name + "?"}
                    confirmLabel="Yes, disconnect"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {apps.length > 1 && (
        <section className="admin-section" aria-labelledby="disconnect-all-title">
          <h2 id="disconnect-all-title">Disconnect everything</h2>
          <form action={disconnectAllAppsAction}>
            <input type="hidden" name="csrf" value={owner.csrf} />
            <ConfirmButtons
              label="Disconnect everything"
              confirmText="Disconnect every app?"
              confirmLabel="Yes, disconnect all"
            />
          </form>
        </section>
      )}
    </>
  );
}
