import { cookies } from "next/headers"

// A stand-in for real auth: the session is just the name someone signed in
// with, kept in a cookie. Swap this out once there's an auth provider.
const COOKIE = "session"

export type Session = { name: string }

export async function getSession(): Promise<Session | null> {
  const name = (await cookies()).get(COOKIE)?.value
  return name ? { name } : null
}

export async function setSession(name: string) {
  ;(await cookies()).set(COOKIE, name, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(COOKIE)
}
