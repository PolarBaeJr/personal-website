"use client";

import { EditorForm } from "@/components/admin/EditorForm";
import { cleanLines, optional, Select, TextField } from "@/components/admin/Fields";
import { ListEditor } from "@/components/admin/ListEditor";
import { useSaveForm } from "@/components/admin/useSaveForm";
import { TAccount } from "@/components/TAccount";
import { saveSectionAction } from "@/app/(owner)/admin/actions";
import type { BalanceItem, Home } from "@/lib/content-store/schema";

export type ProjectOption = { slug: string; title: string; draft: boolean; hidden: boolean };
export type JobOption = { key: string; label: string };

function serialize(home: Home): Home {
  return {
    projects: home.projects,
    experience: home.experience,
    balance: {
      accounting: cleanLines(home.balance.accounting),
      building: home.balance.building.map((item) => ({
        label: item.label.trim(),
        href: optional(item.href),
        hidden: item.hidden,
      })),
    },
  };
}

export function HomeEditor({
  initial,
  version,
  csrf,
  projects,
  jobs,
}: {
  initial: Home;
  version: number | null;
  csrf: string;
  projects: ProjectOption[];
  jobs: JobOption[];
}) {
  const form = useSaveForm({ initial, version, serialize, action: saveSectionAction });
  const { data, setData } = form;
  const clean = serialize(data);

  function projectLabel(slug: string) {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return `${slug} (no longer a project)`;
    if (project.hidden) return `${project.title} (hidden, so it won't show)`;
    if (project.draft) return `${project.title} (draft, only you see it)`;
    return project.title;
  }

  function jobLabel(key: string) {
    return jobs.find((job) => job.key === key)?.label ?? `${key} (no longer on your résumé)`;
  }

  return (
    <EditorForm
      form={form}
      csrf={csrf}
      hidden={{ section: "home" }}
      preview={
        <TAccount
          balance={{
            accounting: clean.balance.accounting,
            building: clean.balance.building.filter((item) => !item.hidden),
          }}
        />
      }
    >
      <ListEditor
        id="edit-projects"
        title="Projects on your home page"
        hint="In this order. Drafts only show to you; hidden projects never show."
        path="projects"
        items={data.projects}
        onChange={(picked) => setData({ ...data, projects: picked })}
        itemLabel={projectLabel}
        emptyText="No projects picked yet."
        picker={{
          label: "Add a project",
          options: projects
            .filter((p) => !data.projects.includes(p.slug))
            .map((p) => ({ value: p.slug, label: p.title })),
          make: (slug) => slug,
        }}
      />

      <section id="edit-experience" className="admin-fieldset" aria-labelledby="edit-experience-title">
        <h2 id="edit-experience-title" className="admin-legend">
          Experience on your home page
        </h2>
        <Select
          label="Which jobs to show"
          hint="Jobs come from your general résumé."
          path="experience.mode"
          value={data.experience.mode}
          onChange={(mode) => setData({ ...data, experience: { ...data.experience, mode } })}
          options={[
            { value: "all", label: "All jobs on the general résumé" },
            { value: "picked", label: "Only the ones I pick" },
          ]}
        />
      </section>
      {data.experience.mode === "picked" && (
        <ListEditor
          title="Jobs to show"
          hint="In this order."
          path="experience.picks"
          items={data.experience.picks}
          onChange={(picks) => setData({ ...data, experience: { ...data.experience, picks } })}
          itemLabel={jobLabel}
          emptyText="No jobs picked yet, so none will show."
          picker={{
            label: "Add a job",
            options: jobs
              .filter((job) => !data.experience.picks.includes(job.key))
              .map((job) => ({ value: job.key, label: job.label })),
            make: (key) => key,
          }}
        />
      )}

      <ListEditor
        id="edit-accounting"
        title="T-account: accounting side"
        path="balance.accounting"
        items={data.balance.accounting}
        onChange={(accounting) =>
          setData({ ...data, balance: { ...data.balance, accounting } })
        }
        itemLabel={(item) => item.trim() || "New line"}
        newItem={() => ""}
        addLabel="Add a line"
        renderItem={(item, update, path) => (
          <TextField label="Line" path={path} value={item} onChange={update} />
        )}
      />

      <ListEditor
        id="edit-building"
        title="T-account: building side"
        path="balance.building"
        items={data.balance.building}
        onChange={(building) => setData({ ...data, balance: { ...data.balance, building } })}
        itemLabel={(item) => item.label.trim() || "New line"}
        newItem={(): BalanceItem => ({ label: "" })}
        addLabel="Add a line"
        canHide
        renderItem={(item, update, path) => (
          <>
            <TextField
              label="Line"
              path={`${path}.label`}
              value={item.label}
              onChange={(label) => update({ ...item, label })}
            />
            <TextField
              label="Link"
              hint='Optional, like "/projects/my-project" or "https://…".'
              path={`${path}.href`}
              value={item.href ?? ""}
              onChange={(href) => update({ ...item, href })}
            />
          </>
        )}
      />
    </EditorForm>
  );
}
