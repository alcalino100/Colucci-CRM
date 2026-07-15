import type { LeadStatus, PropertyStatus, Role, ActionType, AccessAction } from "./mock-data"

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  "em atendimento": "Em atendimento",
  negociando: "Negociando",
  fechado: "Fechado",
  perdido: "Perdido",
}
export const STATUS_VARIANT: Record<LeadStatus, string> = {
  novo: "blue",
  "em atendimento": "amber",
  negociando: "accent",
  fechado: "green",
  perdido: "red",
}
export const LEAD_STATUSES: LeadStatus[] = ["novo", "em atendimento", "negociando", "fechado", "perdido"]

export const PROP_LABEL: Record<PropertyStatus, string> = { disponivel: "Disponível", vendido: "Vendido", alugado: "Alugado" }
export const PROP_VARIANT: Record<PropertyStatus, string> = { disponivel: "green", vendido: "gray", alugado: "blue" }

export const ROLE_VARIANT: Record<Role, string> = { gestor: "accent", corretor: "default" }

export const ACTION_LABEL: Record<ActionType, string> = { criacao: "Criação", edicao: "Edição", exclusao: "Exclusão" }
export const ACTION_VARIANT: Record<ActionType, string> = { criacao: "green", edicao: "blue", exclusao: "red" }

export const ACCESS_LABEL: Record<AccessAction, string> = {
  login: "Login",
  logout: "Logout",
  "tentativa falha": "Tentativa falha",
  "visualizacao lead sensivel": "Visualização de lead",
}

export function brl(v?: number) {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
