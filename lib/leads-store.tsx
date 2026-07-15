"use client"

import { createContext, useContext, useState } from "react"
import { LEADS, type Interaction, type Lead } from "./mock-data"

interface Store {
  leads: Lead[]
  addLead: (l: Omit<Lead, "id" | "criadoEm" | "atualizadoEm" | "interacoes">) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  addInteraction: (leadId: string, i: Omit<Interaction, "id" | "timestamp">) => void
  getLead: (id: string) => Lead | undefined
}

const Ctx = createContext<Store | null>(null)

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(LEADS)

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
  const getLead = (id: string) => leads.find((l) => l.id === id)

  return <Ctx.Provider value={{ leads, addLead, updateLead, addInteraction, getLead }}>{children}</Ctx.Provider>
}

export function useLeads() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useLeads deve ser usado dentro de LeadsProvider")
  return ctx
}
