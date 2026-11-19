"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/admin/next-path";
import { checkOwner, signIn, signOut } from "@/lib/owner";

export type SignInState = { error?: string };

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const password = formData.get("password");
  const result = await signIn(typeof password === "string" ? password : "");
  if (!result.ok) return { error: result.error };
  redirect(safeNextPath(formData.get("next")));
}

export async function signOutAction(formData: FormData): Promise<void> {
  if (await checkOwner(formData.get("csrf"))) await signOut();
  redirect("/");
}
