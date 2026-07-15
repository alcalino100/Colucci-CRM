"use client"

import { createContext, useCallback, useContext, useState } from "react"
import {
  LEADS,
  VISITS,
  USERS,
  CHANGE_LOGS,
  type ChangeLog,
  type Interaction,
  type Lead,
  type Notification,
  type User,
  type Visit,
} from "./mock-data"

interface Store {
  leads: Lead[]
  visits: Visit[]
  notifications: Notification[]
  users: User[]
  changeLogs: ChangeLog[]
  addLead: (l: Omit<Lead, "id" | "criadoEm" | "atualizadoEm" | "interacoes">) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  deleteLead: (id: string) => void
  addInteraction: (leadId: string, i: Omit<Interaction, "id" | "timestamp">) => void
  getLead: (id: string) => Lead | undefined
  addVisit: (v: Omit<Visit, "id">) => void
  notify: (texto: string) => void
  markNotificationsRead: () => void
  logChange: (e: Omit<ChangeLog, "id" | "dataHora">) => void
  addUser: (u: Omit<User, "id" | "criadoEm">) => { ok: boolean; error?: string }
  updateUser: (id: string, patch: Partial<User>) => { ok: boolean; error?: string }
}

const Ctx = createContext<Store | null>(null)

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(LEADS)
  const [visits, setVisits] = useState<Visit[]>(VISITS)
  const [users, setUsers] = useState<User[]>(USERS)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>(CHANGE_LOGS)

  const logChange: Store["logChange"] = (e) => {
    setChangeLogs((prev) => [
      { ...e, id: `cl${Date.now()}${Math.random().toString(36).slice(2, 6)}`, dataHora: new Date().toISOString() },
      ...prev,
    ])
  }

  const notify = useCallback((texto: string) => {
    setNotifications((prev) => [{ id: `n${Date.now()}`, texto, timestamp: new Date().toISOString(), read: false }, ...prev])
  }, [])

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const addLead: Store["addLead"] = (l) => {
    const now = new Date().toISOString()
    setLeads((prev) => [{ ...l, id: `l${Date.now()}`, criadoEm: now, atualizadoEm: now, interacoes: [] }, ...prev])
  }
  const updateLead: Store["updateLead"] = (id, patch) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, atualizadoEm: new Date().toISOString() } : l)))
  }
  const addInteraction: Store["addInteraction"] = (leadId, i) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId
      ? { ...l, atualizadoEm: new Date().toISOString(), interacoes: [...l.interacoes, { ...i, id: `i${Date.now()}`, timestamp: new Date().toISOString() }] }
      : l)))
  }
  const deleteLead: Store["deleteLead"] = (id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }
  const getLead = (id: string) => leads.find((l) => l.id === id)

  const addVisit: Store["addVisit"] = (v) => {
    setVisits((prev) => [...prev, { ...v, id: `v${Date.now()}` }])
  }

  const addUser: Store["addUser"] = (u) => {
    if (users.some((x) => x.email.toLowerCase() === u.email.trim().toLowerCase())) {
      return { ok: false, error: "E-mail já cadastrado." }
    }
    setUsers((prev) => [...prev, { ...u, email: u.email.trim().toLowerCase(), id: `u${Date.now()}`, criadoEm: new Date().toISOString().slice(0, 10) }])
    return { ok: true }
  }
  const updateUser: Store["updateUser"] = (id, patch) => {
    if (patch.email && users.some((x) => x.id !== id && x.email.toLowerCase() === patch.email!.trim().toLowerCase())) {
      return { ok: false, error: "E-mail já cadastrado." }
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch, email: patch.email ? patch.email.trim().toLowerCase() : u.email } : u)))
    return { ok: true }
  }

  return (
    <Ctx.Provider value={{ leads, visits, notifications, users, changeLogs, addLead, updateLead, deleteLead, addInteraction, getLead, addVisit, notify, markNotificationsRead, logChange, addUser, updateUser }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLeads() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useLeads deve ser usado dentro de LeadsProvider")
  return ctx
}
