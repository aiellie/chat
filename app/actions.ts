"use server"

import { clearSession, setSession } from "@/lib/session"

export async function signIn(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 40)
  if (!name) return
  await setSession(name)
}

export async function signOut() {
  await clearSession()
}
