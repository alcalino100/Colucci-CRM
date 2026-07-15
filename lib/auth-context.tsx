"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { USERS, type Role, type User } from "./mock-data"

type SessionUser = Omit<User, "senha">

interface AuthCtx {
  user: SessionUser | null
  loading: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; role?: Role }>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)
const KEY = "imobcrm.session"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [])

  async function login(email: string, senha: string) {
    await new Promise((r) => setTimeout(r, 800))
    const found = USERS.find((u) => u.email === email.trim().toLowerCase() && u.senha === senha && u.ativo)
    if (!found) return { ok: false }
    const { senha: _omit, ...session } = found
    setUser(session)
    localStorage.setItem(KEY, JSON.stringify(session))
    return { ok: true, role: found.role }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(KEY)
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
