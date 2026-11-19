"use client";

import { useActionState, useState } from "react";
import { NOT_REACHED, type FormState } from "@/lib/admin/form-state";

type Saved = Omit<FormState, "version"> & { savedJson: string; version: number | null };

export type SaveFormHandle = {
  formAction: (formData: FormData) => void;
  json: string;
  baseVersion: number | null;
  state: Saved;
  pending: boolean;
  dirty: boolean;
  note: string;
  setNote: (note: string) => void;
};

// State for an editor form: the working copy, the note, and the last save.
// The form posts the working copy as JSON (from `serialize`, which also
// strips blank optional fields) plus baseVersion, so a save made somewhere
// else in the meantime is refused instead of overwritten.
export function useSaveForm<T>({
  initial,
  version,
  serialize,
  action,
  onSaved,
}: {
  initial: T;
  version: number | null;
  serialize: (data: T) => unknown;
  action: (formData: FormData) => Promise<FormState>;
  onSaved?: (formData: FormData) => void;
}) {
  const [data, setData] = useState(initial);
  const [note, setNote] = useState("");
  const [state, formAction, pending] = useActionState<Saved, FormData>(
    async (prev, formData) => {
      let result: FormState;
      try {
        result = await action(formData);
      } catch {
        result = { ok: false, message: NOT_REACHED };
      }
      if (!result.ok) return { ...result, savedJson: prev.savedJson, version: prev.version };
      setNote("");
      onSaved?.(formData);
      return {
        ...result,
        savedJson: String(formData.get("data")),
        version: result.version ?? prev.version,
      };
    },
    { savedJson: JSON.stringify(serialize(initial)), version },
  );
  const json = JSON.stringify(serialize(data));
  return {
    data,
    setData,
    note,
    setNote,
    state,
    formAction,
    pending,
    json,
    dirty: json !== state.savedJson,
    baseVersion: state.version,
  };
}
