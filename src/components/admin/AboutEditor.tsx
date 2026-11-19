"use client";

import {
  ClubsView,
  CompetitionsView,
  HobbiesView,
  TestimonialsView,
} from "@/components/AboutViews";
import { EditorForm } from "@/components/admin/EditorForm";
import { optional, TextArea, TextField } from "@/components/admin/Fields";
import { ListEditor } from "@/components/admin/ListEditor";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { saveSectionAction } from "@/app/(owner)/admin/actions";
import type {
  About,
  Club,
  Competition,
  Hobby,
  Testimonial,
} from "@/lib/content-store/schema";

function shown<T extends { hidden?: boolean }>(items: T[]): T[] {
  return items.filter((item) => !item.hidden);
}

// Blank optional fields are left out, as the schema expects.
function serialize(about: About): About {
  return {
    competitions: about.competitions.map((c) => ({
      name: c.name.trim(),
      role: optional(c.role),
      result: optional(c.result),
      start: optional(c.start),
      end: optional(c.end),
      href: optional(c.href),
      hidden: c.hidden,
    })),
    clubs: about.clubs.map((c) => ({
      name: c.name.trim(),
      role: optional(c.role),
      start: optional(c.start),
      end: optional(c.end),
      href: optional(c.href),
      hidden: c.hidden,
    })),
    hobbies: about.hobbies.map((h) => ({ ...h, name: h.name.trim(), blurb: h.blurb.trim() })),
    testimonials: about.testimonials.map((t) => ({
      ...t,
      quote: t.quote.trim(),
      name: t.name.trim(),
      role: t.role.trim(),
      org: t.org.trim(),
    })),
  };
}

const DATE_HINT = 'Plain text, like "May 2026".';
const LINK_HINT = 'Optional. Starts with "https://", or "/" for a page on this site.';

function DatesAndLink<T extends Club | Competition>({
  item,
  update,
  path,
  endHint,
}: {
  item: T;
  update: (next: T) => void;
  path: string;
  endHint: string;
}) {
  return (
    <>
      <div className="admin-field-row">
        <TextField
          label="Start"
          hint={DATE_HINT}
          path={`${path}.start`}
          value={item.start ?? ""}
          onChange={(start) => update({ ...item, start })}
        />
        <TextField
          label="End"
          hint={endHint}
          path={`${path}.end`}
          value={item.end ?? ""}
          onChange={(end) => update({ ...item, end })}
        />
      </div>
      <TextField
        label="Link"
        hint={LINK_HINT}
        type="url"
        path={`${path}.href`}
        value={item.href ?? ""}
        onChange={(href) => update({ ...item, href })}
      />
    </>
  );
}

export function AboutEditor({
  initial,
  version,
  csrf,
}: {
  initial: About;
  version: number | null;
  csrf: string;
}) {
  const form = useSaveForm({ initial, version, serialize, action: saveSectionAction });
  const { data, setData } = form;
  const clean = serialize(data);

  return (
    <EditorForm
      form={form}
      csrf={csrf}
      hidden={{ section: "about" }}
      preview={
        <div className="stack">
          <CompetitionsView competitions={shown(clean.competitions)} />
          <ClubsView clubs={shown(clean.clubs)} />
          <HobbiesView hobbies={shown(clean.hobbies)} />
          <p className="admin-muted">On the home page:</p>
          <TestimonialsView testimonials={shown(clean.testimonials)} />
        </div>
      }
    >
      <ListEditor
        id="edit-clubs"
        title="Clubs"
        path="clubs"
        items={data.clubs}
        onChange={(clubs) => setData({ ...data, clubs })}
        itemLabel={(club) => club.name.trim() || "New club"}
        newItem={(): Club => ({ name: "" })}
        addLabel="Add a club"
        canHide
        collapsible
        renderItem={(club, update, path) => (
          <>
            <TextField
              label="Club name"
              path={`${path}.name`}
              value={club.name}
              onChange={(name) => update({ ...club, name })}
            />
            <TextField
              label="Your role"
              hint="Optional, like Member or Treasurer."
              path={`${path}.role`}
              value={club.role ?? ""}
              onChange={(role) => update({ ...club, role })}
            />
            <DatesAndLink
              item={club}
              update={update}
              path={path}
              endHint='Leave blank while you are still a member (shows "Present").'
            />
          </>
        )}
      />

      <ListEditor
        id="edit-competitions"
        title="Case competitions and awards"
        hint="Competitions on your general résumé show up on their own. Add the others here."
        path="competitions"
        items={data.competitions}
        onChange={(competitions) => setData({ ...data, competitions })}
        itemLabel={(c) => c.name.trim() || "New competition"}
        newItem={(): Competition => ({ name: "" })}
        addLabel="Add a competition"
        canHide
        collapsible
        renderItem={(c, update, path) => (
          <>
            <TextField
              label="Competition name"
              path={`${path}.name`}
              value={c.name}
              onChange={(name) => update({ ...c, name })}
            />
            <TextField
              label="Your role"
              hint="Optional, like Team Member."
              path={`${path}.role`}
              value={c.role ?? ""}
              onChange={(role) => update({ ...c, role })}
            />
            <TextField
              label="Result or award"
              hint="Optional. Only if there was one."
              path={`${path}.result`}
              value={c.result ?? ""}
              onChange={(result) => update({ ...c, result })}
            />
            <DatesAndLink item={c} update={update} path={path} endHint="Optional." />
          </>
        )}
      />

      <ListEditor
        id="edit-hobbies"
        title="Hobbies"
        path="hobbies"
        items={data.hobbies}
        onChange={(hobbies) => setData({ ...data, hobbies })}
        itemLabel={(h) => h.name.trim() || "New hobby"}
        newItem={(): Hobby => ({ name: "", blurb: "" })}
        addLabel="Add a hobby"
        canHide
        collapsible
        renderItem={(h, update, path) => (
          <>
            <TextField
              label="Hobby"
              path={`${path}.name`}
              value={h.name}
              onChange={(name) => update({ ...h, name })}
            />
            <TextArea
              label="A sentence or two about it"
              path={`${path}.blurb`}
              value={h.blurb}
              rows={3}
              onChange={(blurb) => update({ ...h, blurb })}
            />
            {h.image && <p className="admin-hint">Its photo stays as it is.</p>}
          </>
        )}
      />

      <ListEditor
        id="edit-testimonials"
        title="Testimonials"
        hint="Shown on the home page. Get their permission first, and never add their email, phone number or LinkedIn."
        path="testimonials"
        items={data.testimonials}
        onChange={(testimonials) => setData({ ...data, testimonials })}
        itemLabel={(t) => t.name.trim() || "New testimonial"}
        newItem={(): Testimonial => ({ quote: "", name: "", role: "", org: "" })}
        addLabel="Add a testimonial"
        canHide
        collapsible
        renderItem={(t, update, path) => (
          <>
            <TextArea
              label="What they said"
              path={`${path}.quote`}
              value={t.quote}
              rows={3}
              onChange={(quote) => update({ ...t, quote })}
            />
            <TextField
              label="Their name"
              path={`${path}.name`}
              value={t.name}
              onChange={(name) => update({ ...t, name })}
            />
            <div className="admin-field-row">
              <TextField
                label="Their role"
                path={`${path}.role`}
                value={t.role}
                onChange={(role) => update({ ...t, role })}
              />
              <TextField
                label="Organisation"
                path={`${path}.org`}
                value={t.org}
                onChange={(org) => update({ ...t, org })}
              />
            </div>
          </>
        )}
      />
    </EditorForm>
  );
}
