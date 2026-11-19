import { fieldLabel } from "@/lib/admin/fields";

// A stored version in plain words: labelled fields and numbered lists, never
// raw data.
function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="admin-muted">(blank)</span>;
  }
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value === "string" || typeof value === "number") return <>{String(value)}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="admin-muted">None</span>;
    return (
      <ol>
        {value.map((item, i) => (
          <li key={i}>
            <Value value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <dl>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
        <div key={key}>
          <dt>{fieldLabel(key)}</dt>
          <dd>
            <Value value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ReadableData({ data }: { data: unknown }) {
  return (
    <div className="admin-readable">
      <Value value={data} />
    </div>
  );
}
