import type { LeadStatus, PropertyStatus, Role, ActionType, AccessAction, Origem } from "./mock-data"

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo Lead",
  "em atendimento": "Em Atendimento",
  "visita agendada": "Visita Agendada",
  negociando: "Negociando",
  "proposta enviada": "Proposta Enviada",
  fechado: "Fechado",
  perdido: "Perdido",
}
export const STATUS_VARIANT: Record<LeadStatus, string> = {
  novo: "blue",
  "em atendimento": "slate",
  "visita agendada": "amber",
  negociando: "accent",
  "proposta enviada": "accent",
  fechado: "green",
  perdido: "gray",
}
// cor de acento (topo da coluna do kanban)
export const STATUS_ACCENT: Record<LeadStatus, string> = {
  novo: "#0ea5e9",
  "em atendimento": "#54595f",
  "visita agendada": "#f59e0b",
  negociando: "#b22222",
  "proposta enviada": "#c41e24",
  fechado: "#16a34a",
  perdido: "#a1a1aa",
}
export const LEAD_STATUSES: LeadStatus[] = [
  "novo",
  "em atendimento",
  "visita agendada",
  "negociando",
  "proposta enviada",
  "fechado",
  "perdido",
]

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

export const ORIGEM_VARIANT: Record<Origem, string> = {
  Instagram: "accent",
  Indicação: "green",
  "Tráfego Pago": "blue",
  Outro: "gray",
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
export function fmtDayLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}
