"use client";

import { useState } from "react";
import { EditorForm } from "@/components/admin/EditorForm";
import {
  cleanLines,
  LinesField,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@/components/admin/Fields";
import { ListEditor } from "@/components/admin/ListEditor";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { ProjectList } from "@/components/ProjectList";
import { saveSectionAction } from "@/app/(owner)/admin/actions";
import type { Project, ProjectsSection } from "@/lib/content-store/schema";

type ProjectLink = Project["links"][number];

function serialize(data: ProjectsSection): ProjectsSection {
  return {
    projects: data.projects.map((p) => ({
      ...p,
      slug: p.slug.trim(),
      title: p.title.trim(),
      summary: p.summary.trim(),
      description: p.description.trim(),
      tags: cleanLines(p.tags),
      links: p.links.map((link) => ({ ...link, href: link.href.trim() })),
    })),
  };
}

const CATEGORIES = [
  { value: "accounting", label: "Accounting" },
  { value: "tech", label: "Tech" },
  { value: "other", label: "Other" },
] as const;

const LINK_KINDS = [
  { value: "live", label: 'Live site ("Visit site")' },
  { value: "github", label: 'Code on GitHub ("View on GitHub")' },
] as const;

function LinksField({
  links,
  onChange,
  path,
}: {
  links: ProjectLink[];
  onChange: (links: ProjectLink[]) => void;
  path: string;
}) {
  return (
    <div className="admin-field">
      <p className="admin-label">Links</p>
      {links.length === 0 && <p className="admin-hint">No links.</p>}
      {links.map((link, i) => (
        <div key={i} className="admin-picker">
          <Select
            label={`Link ${i + 1} type`}
            path={`${path}[${i}].kind`}
            value={link.kind}
            onChange={(kind) => onChange(links.map((l, j) => (j === i ? { ...l, kind } : l)))}
            options={[...LINK_KINDS]}
          />
          <TextField
            label={`Link ${i + 1} address`}
            type="url"
            path={`${path}[${i}].href`}
            value={link.href}
            onChange={(href) => onChange(links.map((l, j) => (j === i ? { ...l, href } : l)))}
          />
          <button
            type="button"
            className="admin-btn admin-btn--quiet"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
          >
            Remove link {i + 1}
          </button>
        </div>
      ))}
      <div className="admin-list-actions">
        <button
          type="button"
          className="admin-btn"
          onClick={() => onChange([...links, { kind: "live", href: "" }])}
        >
          Add a link
        </button>
      </div>
    </div>
  );
}

export function ProjectsEditor({
  initial,
  version,
  csrf,
  openSlug,
}: {
  initial: ProjectsSection;
  version: number | null;
  csrf: string;
  openSlug?: string;
}) {
  const form = useSaveForm({ initial, version, serialize, action: saveSectionAction });
  const { data, setData } = form;
  // A saved project's web address is fixed: changing it would break links.
  const [savedSlugs] = useState(() => new Set(initial.projects.map((p) => p.slug)));
  const clean = serialize(data);

  return (
    <EditorForm
      form={form}
      csrf={csrf}
      hidden={{ section: "projects" }}
      preview={
        <ProjectList
          projects={clean.projects.filter((p) => !p.hidden)}
          headingLevel="h2"
        />
      }
    >
      <ListEditor
        id="edit-projects"
        title="Projects"
        hint="In the order they show on the Projects page."
        path="projects"
        items={data.projects}
        onChange={(projects) => setData({ projects })}
        itemLabel={(p) => (p.title.trim() || "New project") + (p.draft ? " (draft)" : "")}
        newItem={(): Project => ({
          slug: "",
          title: "",
          summary: "",
          description: "",
          category: "tech",
          tags: [],
          links: [],
          draft: true,
        })}
        addLabel="Add a project"
        canHide
        collapsible
        openIndex={openSlug ? initial.projects.findIndex((p) => p.slug === openSlug) : undefined}
        renderItem={(p, update, path) => (
          <>
            <TextField
              label="Title"
              path={`${path}.title`}
              value={p.title}
              onChange={(title) => update({ ...p, title })}
            />
            <TextField
              label="Web address"
              hint={
                savedSlugs.has(p.slug)
                  ? `The page is at /projects/${p.slug}. It can't be changed once saved.`
                  : "Lowercase words joined by hyphens, like my-project. It can't be changed once saved."
              }
              path={`${path}.slug`}
              value={p.slug}
              readOnly={savedSlugs.has(p.slug)}
              onChange={(slug) => update({ ...p, slug })}
            />
            <TextField
              label="One-line summary"
              hint="Shown in the project lists."
              path={`${path}.summary`}
              value={p.summary}
              onChange={(summary) => update({ ...p, summary })}
            />
            <TextArea
              label="Description"
              hint="Shown on the project's own page."
              path={`${path}.description`}
              value={p.description}
              onChange={(description) => update({ ...p, description })}
            />
            <Select
              label="Category"
              path={`${path}.category`}
              value={p.category}
              onChange={(category) => update({ ...p, category })}
              options={[...CATEGORIES]}
            />
            <LinesField
              label="Tags"
              hint="A few words each. One per line."
              path={`${path}.tags`}
              value={p.tags}
              onChange={(tags) => update({ ...p, tags })}
            />
            <LinksField
              links={p.links}
              path={`${path}.links`}
              onChange={(links) => update({ ...p, links })}
            />
            <Switch
              label="Still a draft (only you can see it)"
              checked={p.draft}
              onChange={(draft) => update({ ...p, draft })}
            />
            {p.images && p.images.length > 0 && (
              <p className="admin-hint">Its photos stay as they are.</p>
            )}
          </>
        )}
      />
    </EditorForm>
  );
}
