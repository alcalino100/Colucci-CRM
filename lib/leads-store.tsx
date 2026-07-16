"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import {
  type ChangeLog,
  type Interaction,
  type Lead,
  type Notification,
  type Origem,
  type User,
  type Visit,
} from "./mock-data"
import { supabase } from "./supabase/client"

interface Store {
  leads: Lead[]
  visits: Visit[]
  notifications: Notification[]
  users: User[]
  changeLogs: ChangeLog[]
  corretores: User[]
  userName: (id: string) => string
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

// ---------- Conversores entre o banco (colunas em pt) e o app (camelCase) ----------

// leads (banco) -> Lead (app)
function rowToLead(r: any): Lead {
  return {
    id: r.id,
    nome: r.nome ?? "",
    telefone: r.telefone ?? "",
    email: r.email ?? "",
    imovelRef: r.referencia_imovel ?? "",
    origem: (r.origem ?? "Outro") as Origem,
    observacoes: r.observacoes ?? "",
    status: r.status,
    valorNegociacao: r.valor_proposta ?? undefined,
    corretorId: r.corretor_id ?? "",
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
    interacoes: [], // interações ainda não têm tabela própria (fase futura)
  }
}

// Lead parcial (app) -> objeto para o banco (só os campos presentes)
function leadPatchToRow(p: Partial<Lead>): Record<string, any> {
  const row: Record<string, any> = {}
  if (p.nome !== undefined) row.nome = p.nome
  if (p.telefone !== undefined) row.telefone = p.telefone
  if (p.email !== undefined) row.email = p.email
  if (p.imovelRef !== undefined) row.referencia_imovel = p.imovelRef
  if (p.origem !== undefined) row.origem = p.origem
  if (p.observacoes !== undefined) row.observacoes = p.observacoes
  if (p.status !== undefined) row.status = p.status
  if (p.valorNegociacao !== undefined) row.valor_proposta = p.valorNegociacao
  if (p.corretorId !== undefined) row.corretor_id = p.corretorId || null
  return row
}

// visitas (banco) -> Visit (app)
function rowToVisit(r: any): Visit {
  return {
    id: r.id,
    leadId: r.lead_id,
    data: r.data,
    hora: r.horario ?? "",
    corretorId: r.corretor_id ?? "",
    imovelRef: "", // coluna não existe em visitas; mantido vazio
    observacoes: r.observacoes ?? "",
  }
}

// usuarios (banco) -> User (app)
function rowToUser(r: any): User {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    senha: r.senha_hash ?? "",
    role: r.role,
    ativo: r.status === "ativo",
    criadoEm: r.criado_em,
  }
}

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [users, setUsers] = useState<User[]>([])
  // Notificações e logs seguem locais nesta fase (não persistem no banco ainda)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([])

  // ---------- Carregamento inicial + Realtime ----------
  const loadLeads = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("criado_em", { ascending: false })
    if (data) setLeads(data.map(rowToLead))
  }, [])
  const loadVisits = useCallback(async () => {
    const { data } = await supabase.from("visitas").select("*")
    if (data) setVisits(data.map(rowToVisit))
  }, [])
  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("usuarios").select("*").order("criado_em", { ascending: true })
    if (data) setUsers(data.map(rowToUser))
  }, [])

  useEffect(() => {
    loadLeads()
    loadVisits()
    loadUsers()

    // Escuta mudanças em tempo real e recarrega a tabela afetada.
    const canal = supabase
      .channel("crm-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, loadLeads)
      .on("postgres_changes", { event: "*", schema: "public", table: "visitas" }, loadVisits)
      .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, loadUsers)
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [loadLeads, loadVisits, loadUsers])

  // ---------- Ações de LEAD (gravam no banco; a tela atualiza via realtime) ----------
  const addLead: Store["addLead"] = async (l) => {
    await supabase.from("leads").insert({
      nome: l.nome,
      telefone: l.telefone,
      email: l.email,
      referencia_imovel: l.imovelRef,
      origem: l.origem,
      observacoes: l.observacoes,
      status: l.status,
      valor_proposta: l.valorNegociacao ?? null,
      corretor_id: l.corretorId || null,
    })
    await loadLeads()
  }
  const updateLead: Store["updateLead"] = async (id, patch) => {
    await supabase
      .from("leads")
      .update({ ...leadPatchToRow(patch), atualizado_em: new Date().toISOString() })
      .eq("id", id)
    await loadLeads()
  }
  const deleteLead: Store["deleteLead"] = async (id) => {
    await supabase.from("leads").delete().eq("id", id)
    await loadLeads()
  }

  // Interações ainda são locais (sem tabela). Mantém o app funcionando sem quebrar.
  const addInteraction: Store["addInteraction"] = (leadId, i) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              atualizadoEm: new Date().toISOString(),
              interacoes: [...l.interacoes, { ...i, id: `i${Date.now()}`, timestamp: new Date().toISOString() }],
            }
          : l,
      ),
    )
  }
  const getLead = (id: string) => leads.find((l) => l.id === id)

  // ---------- Visitas ----------
  const addVisit: Store["addVisit"] = async (v) => {
    await supabase.from("visitas").insert({
      lead_id: v.leadId,
      data: v.data,
      horario: v.hora,
      corretor_id: v.corretorId || null,
      observacoes: v.observacoes,
    })
    await loadVisits()
  }

  // ---------- Notificações e logs (locais nesta fase) ----------
  const notify = useCallback((texto: string) => {
    setNotifications((prev) => [{ id: `n${Date.now()}`, texto, timestamp: new Date().toISOString(), read: false }, ...prev])
  }, [])
  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])
  const logChange: Store["logChange"] = (e) => {
    setChangeLogs((prev) => [
      { ...e, id: `cl${Date.now()}${Math.random().toString(36).slice(2, 6)}`, dataHora: new Date().toISOString() },
      ...prev,
    ])
  }

  // ---------- Usuários (persistem no banco) ----------
  const addUser: Store["addUser"] = (u) => {
    const email = u.email.trim().toLowerCase()
    if (users.some((x) => x.email.toLowerCase() === email)) {
      return { ok: false, error: "E-mail já cadastrado." }
    }
    // Grava de forma assíncrona; a lista atualiza via realtime/loadUsers.
    void supabase
      .from("usuarios")
      .insert({
        nome: u.nome,
        email,
        senha_hash: u.senha,
        role: u.role,
        status: u.ativo ? "ativo" : "inativo",
      })
      .then(() => loadUsers())
    return { ok: true }
  }
  const updateUser: Store["updateUser"] = (id, patch) => {
    const email = patch.email ? patch.email.trim().toLowerCase() : undefined
    if (email && users.some((x) => x.id !== id && x.email.toLowerCase() === email)) {
      return { ok: false, error: "E-mail já cadastrado." }
    }
    const row: Record<string, any> = {}
    if (patch.nome !== undefined) row.nome = patch.nome
    if (email !== undefined) row.email = email
    if (patch.senha !== undefined) row.senha_hash = patch.senha
    if (patch.role !== undefined) row.role = patch.role
    if (patch.ativo !== undefined) row.status = patch.ativo ? "ativo" : "inativo"
    void supabase.from("usuarios").update(row).eq("id", id).then(() => loadUsers())
    return { ok: true }
  }

  // Fonte única da verdade: corretores e nomes vêm da tabela usuarios (não do mock)
  const corretores = users.filter((u) => u.role === "corretor")
  const userName = (id: string) => users.find((u) => u.id === id)?.nome ?? "—"

  return (
    <Ctx.Provider
      value={{
        leads, visits, notifications, users, changeLogs, corretores, userName,
        addLead, updateLead, deleteLead, addInteraction, getLead,
        addVisit, notify, markNotificationsRead, logChange, addUser, updateUser,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useLeads() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useLeads deve ser usado dentro de LeadsProvider")
  return ctx
}
