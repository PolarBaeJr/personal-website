"use client";

import { EditorForm } from "@/components/admin/EditorForm";
import { optional, Select, Switch, TextField } from "@/components/admin/Fields";
import { ListEditor } from "@/components/admin/ListEditor";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { saveSectionAction } from "@/app/(owner)/admin/actions";
import type { Social, SocialRow, Socials } from "@/lib/content-store/schema";

const ICONS: { value: Social["icon"]; label: string }[] = [
  { value: "globe", label: "Globe (a website)" },
  { value: "document", label: "Document" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "mail", label: "Envelope (email)" },
  { value: "shuttlecock", label: "Shuttlecock (badminton)" },
  { value: "folder", label: "Folder" },
];

function isEmails(row: SocialRow): row is { include: "emails" } {
  return "include" in row;
}

function serialize(data: Socials): Socials {
  return {
    rows: data.rows.map((row) =>
      isEmails(row)
        ? row
        : {
            label: row.label.trim(),
            href: row.href.trim(),
            icon: row.icon,
            quick: row.quick || undefined,
            copy: optional(row.copy),
            hidden: row.hidden,
          },
    ),
  };
}

export function SocialsEditor({
  initial,
  version,
  csrf,
}: {
  initial: Socials;
  version: number | null;
  csrf: string;
}) {
  const form = useSaveForm({ initial, version, serialize, action: saveSectionAction });
  const { data, setData } = form;
  const hasEmails = data.rows.some(isEmails);

  return (
    <EditorForm form={form} csrf={csrf} hidden={{ section: "socials" }}>
      <ListEditor
        id="edit-rows"
        title="Links page rows"
        hint="Top to bottom, as on /socials."
        path="rows"
        items={data.rows}
        onChange={(rows) => setData({ rows })}
        itemLabel={(row) =>
          isEmails(row) ? "Your emails" : row.label.trim() || "New row"
        }
        newItem={(): SocialRow => ({ label: "", href: "", icon: "globe" })}
        addLabel="Add a row"
        moreAdders={
          hasEmails ? [] : [{ label: "Add your emails", make: (): SocialRow => ({ include: "emails" }) }]
        }
        canHide={(row) => !isEmails(row)}
        collapsible
        renderItem={(row, update, path) =>
          isEmails(row) ? (
            <p className="admin-hint">
              One row for each email shown on the site (set under About you and
              contact details). The first one is also a small icon under your name.
            </p>
          ) : (
            <>
              <TextField
                label="Label"
                path={`${path}.label`}
                value={row.label}
                onChange={(label) => update({ ...row, label })}
              />
              <TextField
                label="Link"
                hint='Starts with "https://", or "/" for a page on this site.'
                type="url"
                path={`${path}.href`}
                value={row.href}
                onChange={(href) => update({ ...row, href })}
              />
              <Select
                label="Icon"
                path={`${path}.icon`}
                value={row.icon}
                onChange={(icon) => update({ ...row, icon })}
                options={ICONS}
              />
              <TextField
                label="Text to copy"
                hint="Optional. Shown in small type under the label, with a copy button."
                path={`${path}.copy`}
                value={row.copy ?? ""}
                onChange={(copy) => update({ ...row, copy })}
              />
              <Switch
                label="Also show as a small icon under your name"
                checked={row.quick === true}
                onChange={(quick) => update({ ...row, quick })}
              />
            </>
          )
        }
      />
    </EditorForm>
  );
}
