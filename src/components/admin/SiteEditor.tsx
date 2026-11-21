"use client";

import { EditorForm } from "@/components/admin/EditorForm";
import {
  cleanLines,
  LinesField,
  Select,
  TextArea,
  TextField,
} from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { ListEditor } from "@/components/admin/ListEditor";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { saveSectionAction } from "@/app/(owner)/admin/actions";
import type { Site, SiteEmail, SiteLink } from "@/lib/content-store/schema";

function serialize(site: Site): Site {
  return {
    ...site,
    tagline: site.tagline.trim(),
    now: site.now?.trim() ?? "",
    about: cleanLines(site.about),
    focus: cleanLines(site.focus),
    location: site.location.trim(),
    footerLines: cleanLines(site.footerLines),
    emails: site.emails.map((e) => ({ ...e, label: e.label.trim(), address: e.address.trim() })),
    links: site.links.map((l) => ({ ...l, label: l.label.trim(), href: l.href.trim() })),
    email: site.email.trim(),
    avatar: site.avatar?.trim() || undefined,
  };
}

function excerpt(text: string): string {
  const clean = text.trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

// The top of the home page, as visitors will see it.
function IntroPreview({ site }: { site: Site }) {
  const now = site.now?.trim();
  return (
    <div className="flow">
      <p className="admin-muted">{site.tagline}</p>
      <p className="lede measure">{site.about.join(" ")}</p>
      {now ? (
        <p className="now-line">
          <span className="now-label">Now</span>
          <span>{now}</span>
        </p>
      ) : null}
      <ul className="hero-facts" aria-label="At a glance">
        {[site.location, ...site.focus].map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}

export function SiteEditor({
  initial,
  version,
  csrf,
}: {
  initial: Site;
  version: number | null;
  csrf: string;
}) {
  const form = useSaveForm({ initial, version, serialize, action: saveSectionAction });
  const { data, setData } = form;
  const clean = serialize(data);
  const addresses = data.emails.map((e) => e.address.trim()).filter(Boolean);
  if (data.email && !addresses.includes(data.email)) addresses.unshift(data.email);

  return (
    <EditorForm
      form={form}
      csrf={csrf}
      hidden={{ section: "site" }}
      preview={<IntroPreview site={clean} />}
    >
      <section id="edit-basics" className="admin-fieldset" aria-labelledby="edit-basics-title">
        <h2 id="edit-basics-title" className="admin-legend">
          The basics
        </h2>
        <TextField
          label="Tagline"
          hint="One line under your name, also used on the links page."
          path="tagline"
          value={data.tagline}
          onChange={(tagline) => setData({ ...data, tagline })}
        />
        <div id="edit-now">
          <TextField
            label="Status line on your home page"
            hint="What you're up to right now. Leave blank to hide it."
            path="now"
            value={data.now ?? ""}
            onChange={(now) => setData({ ...data, now })}
          />
        </div>
        <TextField
          label="Location"
          path="location"
          value={data.location}
          onChange={(location) => setData({ ...data, location })}
        />
        <ImageField
          label="Profile photo"
          hint="Shown on your links page instead of your initials. A square photo of your face works best."
          path="avatar"
          value={data.avatar ? { src: data.avatar } : undefined}
          onChange={(next) => setData({ ...data, avatar: next?.src })}
          csrf={csrf}
          withAlt={false}
          shape="square"
        />
        <LinesField
          label="Footer lines"
          hint="Shown under your name at the bottom of every page. One per line."
          path="footerLines"
          value={data.footerLines}
          onChange={(footerLines) => setData({ ...data, footerLines })}
        />
      </section>

      <ListEditor
        id="edit-about"
        title="About you"
        hint="Shown on the home page as one paragraph."
        path="about"
        items={data.about}
        onChange={(about) => setData({ ...data, about })}
        itemLabel={(p, i) => excerpt(p) || `Paragraph ${i + 1}`}
        newItem={() => ""}
        addLabel="Add a paragraph"
        renderItem={(p, update, path, i) => (
          <TextArea label={`Paragraph ${i + 1}`} path={path} value={p} onChange={update} />
        )}
      />

      <ListEditor
        id="edit-focus"
        title="Focus items"
        hint="Short facts shown after your location on the home page."
        path="focus"
        items={data.focus}
        onChange={(focus) => setData({ ...data, focus })}
        itemLabel={(f) => f.trim() || "New item"}
        newItem={() => ""}
        addLabel="Add an item"
        renderItem={(f, update, path) => (
          <TextField label="Item" path={path} value={f} onChange={update} />
        )}
      />

      <ListEditor
        id="edit-emails"
        title="Emails"
        hint="Shown on the Contact page, in the footer and on the links page."
        path="emails"
        items={data.emails}
        onChange={(emails) => setData({ ...data, emails })}
        itemLabel={(e) => e.label.trim() || e.address.trim() || "New email"}
        newItem={(): SiteEmail => ({ label: "", address: "" })}
        addLabel="Add an email"
        canHide
        collapsible
        renderItem={(e, update, path) => (
          <>
            <TextField
              label="Label"
              hint='Like "Email" or "School email".'
              path={`${path}.label`}
              value={e.label}
              onChange={(label) => update({ ...e, label })}
            />
            <TextField
              label="Email address"
              type="email"
              path={`${path}.address`}
              value={e.address}
              onChange={(address) => update({ ...e, address })}
            />
          </>
        )}
      />

      <section className="admin-fieldset" aria-labelledby="edit-main-email-title">
        <h2 id="edit-main-email-title" className="admin-legend">
          Main email
        </h2>
        <Select
          label="Which email is the main one"
          hint='Used by "Email me" buttons and the contact form.'
          path="email"
          value={data.email}
          onChange={(email) => setData({ ...data, email })}
          options={addresses.map((address) => ({ value: address, label: address }))}
        />
      </section>

      <ListEditor
        id="edit-links"
        title="Links"
        hint="Like LinkedIn and GitHub. Shown on the Contact page, in the footer and on the home page."
        path="links"
        items={data.links}
        onChange={(links) => setData({ ...data, links })}
        itemLabel={(l) => l.label.trim() || "New link"}
        newItem={(): SiteLink => ({ label: "", href: "" })}
        addLabel="Add a link"
        canHide
        collapsible
        renderItem={(l, update, path) => (
          <>
            <TextField
              label="Label"
              path={`${path}.label`}
              value={l.label}
              onChange={(label) => update({ ...l, label })}
            />
            <TextField
              label="Web address"
              hint='Starts with "https://".'
              type="url"
              path={`${path}.href`}
              value={l.href}
              onChange={(href) => update({ ...l, href })}
            />
          </>
        )}
      />
    </EditorForm>
  );
}
