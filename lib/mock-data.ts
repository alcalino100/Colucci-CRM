export type Role = "corretor" | "gestor"
export type LeadStatus =
  | "novo"
  | "em atendimento"
  | "visita agendada"
  | "negociando"
  | "proposta enviada"
  | "fechado"
  | "perdido"
export type Origem = "Instagram" | "Indicação" | "Tráfego Pago" | "Outro"
export type PropertyStatus = "disponivel" | "vendido" | "alugado"
export type ActionType = "criacao" | "edicao" | "exclusao"
export type AccessAction = "login" | "logout" | "tentativa falha" | "visualizacao lead sensivel"

export interface User {
  id: string
  nome: string
  email: string
  senha: string
  role: Role
  ativo: boolean
  criadoEm: string
  avatar?: string
}

export interface Property {
  id: string
  referencia: string
  endereco: string
  tipo: string
  valorTabela: number
  status: PropertyStatus
}

export interface Interaction {
  id: string
  corretor: string
  texto: string
  timestamp: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  email: string
  imovelRef: string
  origem: Origem
  observacoes: string
  status: LeadStatus
  valorNegociacao?: number
  corretorId: string
  criadoEm: string
  atualizadoEm: string
  interacoes: Interaction[]
}

export interface Visit {
  id: string
  leadId: string
  data: string // YYYY-MM-DD
  hora: string // HH:mm
  corretorId: string
  imovelRef: string
  observacoes: string
}

export interface Notification {
  id: string
  texto: string
  timestamp: string
  read: boolean
}

export interface ChangeLog {
  id: string
  dataHora: string
  usuario: string
  acao: ActionType
  entidade: "lead" | "imovel" | "usuario"
  campo: string
  valorAnterior: string
  valorNovo: string
}

export interface AccessLog {
  id: string
  dataHora: string
  usuario: string
  acao: AccessAction
}

export const USERS: User[] = [
  { id: "u1", nome: "Patricia", email: "patricia@colucci.com", senha: "123456", role: "gestor", ativo: true, criadoEm: "2024-01-10" },
  { id: "u2", nome: "Guilherme Garcia", email: "guilherme@colucci.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-02-01" },
]

export const CORRETORES = USERS.filter((u) => u.role === "corretor")

export const PROPERTIES: Property[] = []

export const LEADS: Lead[] = []

export const VISITS: Visit[] = []

export const ORIGENS: Origem[] = ["Instagram", "Indicação", "Tráfego Pago", "Outro"]

export function userName(id: string) {
  return USERS.find((u) => u.id === id)?.nome ?? "—"
}

// ---- Logs (iniciam vazios) ----
export const CHANGE_LOGS: ChangeLog[] = []

export const ACCESS_LOGS: AccessLog[] = []
