"use client";

import { useId, type ReactNode } from "react";
import { useIssue } from "@/components/admin/FormIssues";

type Common = {
  label: string;
  hint?: ReactNode;
  // Where validation issues for this field point, e.g. "clubs[0].name".
  path?: string;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={id} className="admin-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="admin-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="admin-error">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function TextField({
  label,
  hint,
  path,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  autoComplete = "off",
}: Common & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "date";
  placeholder?: string;
  readOnly?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  const error = useIssue(path);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type={type}
        className="admin-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  path,
  value,
  onChange,
  rows = 4,
  className,
}: Common & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  const error = useIssue(path);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={className ? `admin-input admin-textarea ${className}` : "admin-input admin-textarea"}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </FieldShell>
  );
}

// One item per line. Blank lines are dropped when saving (cleanLines).
export function LinesField({
  label,
  hint,
  path,
  value,
  onChange,
  rows = 3,
}: Common & {
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
}) {
  return (
    <TextArea
      label={label}
      hint={hint ?? "One per line."}
      path={path}
      value={value.join("\n")}
      onChange={(text) => onChange(text.split("\n"))}
      rows={rows}
    />
  );
}

export function cleanLines(lines: string[]): string[] {
  return lines.map((line) => line.trim()).filter(Boolean);
}

export function Select<V extends string>({
  label,
  hint,
  path,
  value,
  onChange,
  options,
}: Common & {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string }[];
}) {
  const id = useId();
  const error = useIssue(path);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className="admin-input admin-select"
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="admin-switch-row">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="admin-switch"
        onClick={() => onChange(!checked)}
      >
        <span className="admin-switch-track" aria-hidden="true">
          <span className="admin-switch-thumb" />
        </span>
        <span className="admin-switch-label">{label}</span>
      </button>
      {hint && (
        <p id={`${id}-hint`} className="admin-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

// Drops an optional text field that was left blank, so the stored data
// doesn't carry "" where the schema expects the key to be missing.
export function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
