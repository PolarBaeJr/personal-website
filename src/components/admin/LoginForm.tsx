"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/(owner)/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    async (prev, formData) => {
      try {
        return await signInAction(prev, formData);
      } catch {
        return {
          error:
            "Sign-in didn't reach the site. Check your connection and try again. If it keeps happening, the server's proxy settings may be blocking it.",
        };
      }
    },
    {},
  );

  return (
    <form action={formAction} className="admin-login-form">
      <input type="hidden" name="next" value={next} />
      <label className="admin-field">
        <span className="admin-label">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="admin-input"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>
      {state.error && (
        <p id="login-error" className="admin-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn--primary admin-btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
