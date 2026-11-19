"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Select, Switch } from "@/components/admin/Fields";
import { SortableList } from "@/components/admin/SortableList";
import { useIssue } from "@/components/admin/FormIssues";

// A list of items, each with its own fields: add, remove (with an in-page
// confirm), show or hide on the site, and reorder.

type Hideable = { hidden?: boolean };

export function ListEditor<T>({
  id,
  title,
  hint,
  path,
  items,
  onChange,
  itemLabel,
  newItem,
  addLabel,
  renderItem,
  canHide = false,
  canRemove = () => true,
  collapsible = false,
  openIndex,
  emptyText = "Nothing here yet.",
  moreAdders = [],
  picker,
}: {
  id?: string;
  title: string;
  hint?: ReactNode;
  // Issue path of the list itself, e.g. "about.clubs" is "clubs".
  path: string;
  items: T[];
  onChange: (items: T[]) => void;
  itemLabel: (item: T, index: number) => string;
  newItem?: () => T;
  addLabel?: string;
  renderItem?: (item: T, update: (next: T) => void, path: string, index: number) => ReactNode;
  canHide?: boolean | ((item: T) => boolean);
  canRemove?: (item: T) => boolean;
  // Rows start closed, showing just their name, and open to edit.
  collapsible?: boolean;
  openIndex?: number;
  emptyText?: string;
  // Other kinds of item to add, each with its own button.
  moreAdders?: { label: string; make: () => T }[];
  // Add by choosing from a list (e.g. one of your projects) instead.
  picker?: { label: string; options: { value: string; label: string }[]; make: (value: string) => T };
}) {
  // Stable keys for the rows, so moving one keeps its inputs and focus.
  const nextKey = useRef(items.length);
  const [keys, setKeys] = useState(() => items.map((_, i) => i));
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(openIndex !== undefined && openIndex >= 0 ? [openIndex] : []),
  );
  const [confirming, setConfirming] = useState<number | null>(null);
  const [choice, setChoice] = useState("");
  const headingId = useId();
  const listError = useIssue(path);
  const rowKeys = keys.length === items.length ? keys : items.map((_, i) => i);

  function update(index: number, next: T) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  function move(from: number, to: number) {
    const nextItems = [...items];
    const [item] = nextItems.splice(from, 1);
    nextItems.splice(to, 0, item);
    const nextKeys = [...rowKeys];
    const [key] = nextKeys.splice(from, 1);
    nextKeys.splice(to, 0, key);
    setKeys(nextKeys);
    onChange(nextItems);
  }

  function remove(index: number) {
    setKeys(rowKeys.filter((_, i) => i !== index));
    setConfirming(null);
    onChange(items.filter((_, i) => i !== index));
  }

  function append(item: T) {
    const key = nextKey.current++;
    setKeys([...rowKeys, key]);
    setOpen(new Set([...open, key]));
    onChange([...items, item]);
  }

  function toggle(key: number) {
    const next = new Set(open);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpen(next);
  }

  return (
    <section id={id} className="admin-fieldset" aria-labelledby={headingId}>
      <h2 id={headingId} className="admin-legend">
        {title}
      </h2>
      {hint && <p className="admin-hint">{hint}</p>}
      {listError && <p className="admin-error">{listError}</p>}
      {items.length === 0 ? (
        <p className="admin-muted">{emptyText}</p>
      ) : (
        <SortableList
          keys={rowKeys}
          labels={items.map((item, i) => itemLabel(item, i))}
          onMove={move}
          rowClassName={(i) => ((items[i] as Hideable).hidden ? "admin-row--hidden" : undefined)}
          renderRow={(index, { grip, moveButtons }) => {
            const item = items[index];
            const key = rowKeys[index];
            const label = itemLabel(item, index);
            const isOpen = !collapsible || open.has(key);
            const hidden = (item as Hideable).hidden === true;
            const hideable = typeof canHide === "function" ? canHide(item) : canHide;
            const bodyId = `${headingId}-row-${key}`;
            return (
              <>
                <div className="admin-row-head">
                  {grip}
                  <span className="admin-row-title">
                    {label}
                    {hidden && <span className="badge-draft">Hidden</span>}
                  </span>
                  {collapsible && renderItem && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--quiet"
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      onClick={() => toggle(key)}
                    >
                      {isOpen ? "Close" : "Edit"}
                      <span className="sr-only"> {label}</span>
                    </button>
                  )}
                </div>
                {isOpen && renderItem && (
                  <div id={bodyId} className="admin-row-body">
                    {renderItem(item, (next) => update(index, next), `${path}[${index}]`, index)}
                  </div>
                )}
                <div className="admin-row-actions">
                  {hideable && (
                    <Switch
                      label="Show on the site"
                      checked={!hidden}
                      onChange={(show) => {
                        const next = { ...item } as T & Hideable;
                        if (show) delete next.hidden;
                        else next.hidden = true;
                        update(index, next);
                      }}
                    />
                  )}
                  {moveButtons}
                  {canRemove(item) &&
                    (confirming === key ? (
                      <span className="admin-confirm" role="group" aria-label={`Remove ${label}?`}>
                        <span>Remove {label}?</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          onClick={() => remove(index)}
                        >
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--quiet"
                          onClick={() => setConfirming(null)}
                        >
                          Keep it
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--quiet"
                        onClick={() => setConfirming(key)}
                      >
                        Remove<span className="sr-only"> {label}</span>
                      </button>
                    ))}
                </div>
              </>
            );
          }}
        />
      )}
      {picker && (
        <div className="admin-picker">
          <Select
            label={picker.label}
            value={picker.options.some((o) => o.value === choice) ? choice : ""}
            onChange={setChoice}
            options={[{ value: "", label: "Choose one" }, ...picker.options]}
          />
          <button
            type="button"
            className="admin-btn"
            disabled={!picker.options.some((o) => o.value === choice)}
            onClick={() => {
              append(picker.make(choice));
              setChoice("");
            }}
          >
            Add
          </button>
        </div>
      )}
      {(newItem || moreAdders.length > 0) && (
        <div className="admin-list-actions">
          {newItem && (
            <button type="button" className="admin-btn" onClick={() => append(newItem())}>
              {addLabel ?? "Add"}
            </button>
          )}
          {moreAdders.map((adder) => (
            <button
              key={adder.label}
              type="button"
              className="admin-btn"
              onClick={() => append(adder.make())}
            >
              {adder.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
