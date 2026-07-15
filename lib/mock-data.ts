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
  { id: "u1", nome: "Ana Ribeiro", email: "ana@imob.com", senha: "123456", role: "gestor", ativo: true, criadoEm: "2024-01-10" },
  { id: "u2", nome: "Carlos Mendes", email: "carlos@imob.com", senha: "123456", role: "gestor", ativo: true, criadoEm: "2024-01-10" },
  { id: "u3", nome: "Beatriz Souza", email: "beatriz@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-02-01" },
  { id: "u4", nome: "Diego Alves", email: "diego@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-02-05" },
  { id: "u5", nome: "Fernanda Lima", email: "fernanda@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-02-12" },
  { id: "u6", nome: "Gustavo Nunes", email: "gustavo@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-03-01" },
  { id: "u7", nome: "Helena Castro", email: "helena@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-03-08" },
  { id: "u8", nome: "Igor Pereira", email: "igor@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-03-15" },
  { id: "u9", nome: "Juliana Rocha", email: "juliana@imob.com", senha: "123456", role: "corretor", ativo: true, criadoEm: "2024-04-02" },
]

export const CORRETORES = USERS.filter((u) => u.role === "corretor")

export const PROPERTIES: Property[] = [
  { id: "p1", referencia: "AP-1001", endereco: "Rua das Flores, 120 - Centro", tipo: "Apartamento", valorTabela: 480000, status: "disponivel" },
  { id: "p2", referencia: "CA-2002", endereco: "Av. Beira Mar, 890 - Praia", tipo: "Casa", valorTabela: 1250000, status: "disponivel" },
  { id: "p3", referencia: "AP-1003", endereco: "Rua do Sol, 45 - Jardins", tipo: "Apartamento", valorTabela: 620000, status: "vendido" },
  { id: "p4", referencia: "SL-3004", endereco: "Ed. Corporate, sala 502 - Empresarial", tipo: "Sala Comercial", valorTabela: 340000, status: "disponivel" },
  { id: "p5", referencia: "CA-2005", endereco: "Alameda Verde, 300 - Bosque", tipo: "Casa", valorTabela: 890000, status: "alugado" },
  { id: "p6", referencia: "AP-1006", endereco: "Rua Nova, 78 - Centro", tipo: "Apartamento", valorTabela: 410000, status: "disponivel" },
]

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function isoDate(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const LEADS: Lead[] = [
  { id: "l1", nome: "Roberto Dias", telefone: "(11) 98888-1111", email: "roberto@email.com", imovelRef: "AP-1001", origem: "Tráfego Pago", observacoes: "Busca 2 dormitórios", status: "negociando", valorNegociacao: 460000, corretorId: "u3", criadoEm: daysAgo(2), atualizadoEm: daysAgo(1), interacoes: [
    { id: "i1", corretor: "Beatriz Souza", texto: "Primeiro contato realizado por telefone.", timestamp: daysAgo(2) },
    { id: "i2", corretor: "Beatriz Souza", texto: "Visita agendada para sábado.", timestamp: daysAgo(1) },
  ] },
  { id: "l2", nome: "Marina Costa", telefone: "(11) 97777-2222", email: "marina@email.com", imovelRef: "CA-2002", origem: "Indicação", observacoes: "", status: "visita agendada", corretorId: "u3", criadoEm: daysAgo(5), atualizadoEm: daysAgo(3), interacoes: [
    { id: "i3", corretor: "Beatriz Souza", texto: "Enviado material do imóvel por WhatsApp.", timestamp: daysAgo(4) },
  ] },
  { id: "l3", nome: "Pedro Santos", telefone: "(11) 96543-1000", email: "pedro@email.com", imovelRef: "AP-1006", origem: "Instagram", observacoes: "Interesse em financiamento", status: "novo", corretorId: "u4", criadoEm: daysAgo(1), atualizadoEm: daysAgo(1), interacoes: [] },
  { id: "l4", nome: "Luiza Ferreira", telefone: "(11) 96666-3333", email: "luiza@email.com", imovelRef: "AP-1003", origem: "Tráfego Pago", observacoes: "", status: "fechado", valorNegociacao: 600000, corretorId: "u4", criadoEm: daysAgo(20), atualizadoEm: daysAgo(6), interacoes: [
    { id: "i4", corretor: "Diego Alves", texto: "Proposta aceita. Contrato assinado.", timestamp: daysAgo(6) },
  ] },
  { id: "l5", nome: "Tiago Moura", telefone: "(11) 95555-4444", email: "", imovelRef: "SL-3004", origem: "Outro", observacoes: "", status: "perdido", corretorId: "u5", criadoEm: daysAgo(15), atualizadoEm: daysAgo(8), interacoes: [] },
  { id: "l6", nome: "Camila Nunes", telefone: "(11) 94444-5555", email: "camila@email.com", imovelRef: "CA-2005", origem: "Instagram", observacoes: "Interesse em locação", status: "proposta enviada", valorNegociacao: 4500, corretorId: "u5", criadoEm: daysAgo(7), atualizadoEm: daysAgo(2), interacoes: [] },
  { id: "l7", nome: "Bruno Teixeira", telefone: "(11) 93333-6666", email: "bruno@email.com", imovelRef: "AP-1006", origem: "Tráfego Pago", observacoes: "", status: "novo", corretorId: "u7", criadoEm: daysAgo(3), atualizadoEm: daysAgo(3), interacoes: [] },
  { id: "l8", nome: "Sofia Andrade", telefone: "(11) 92222-7777", email: "sofia@email.com", imovelRef: "AP-1001", origem: "Indicação", observacoes: "", status: "em atendimento", corretorId: "u7", criadoEm: daysAgo(9), atualizadoEm: daysAgo(4), interacoes: [] },
  { id: "l9", nome: "Rafael Gomes", telefone: "(11) 91111-8888", email: "rafael@email.com", imovelRef: "CA-2005", origem: "Outro", observacoes: "", status: "em atendimento", corretorId: "u8", criadoEm: daysAgo(6), atualizadoEm: daysAgo(6), interacoes: [] },
  { id: "l10", nome: "Isabela Rocha", telefone: "(11) 90000-9999", email: "isabela@email.com", imovelRef: "CA-2002", origem: "Indicação", observacoes: "", status: "fechado", valorNegociacao: 1200000, corretorId: "u8", criadoEm: daysAgo(30), atualizadoEm: daysAgo(10), interacoes: [] },
  { id: "l11", nome: "Otávio Barros", telefone: "(11) 98765-4321", email: "otavio@email.com", imovelRef: "AP-1006", origem: "Instagram", observacoes: "", status: "proposta enviada", valorNegociacao: 400000, corretorId: "u9", criadoEm: daysAgo(4), atualizadoEm: daysAgo(1), interacoes: [] },
  { id: "l12", nome: "Vanessa Lopes", telefone: "(11) 97654-3210", email: "vanessa@email.com", imovelRef: "AP-1003", origem: "Tráfego Pago", observacoes: "", status: "visita agendada", corretorId: "u9", criadoEm: daysAgo(2), atualizadoEm: daysAgo(2), interacoes: [] },
]

export const VISITS: Visit[] = [
  { id: "v1", leadId: "l2", data: isoDate(1), hora: "10:00", corretorId: "u3", imovelRef: "CA-2002", observacoes: "Cliente pediu para conhecer a área externa." },
  { id: "v2", leadId: "l12", data: isoDate(1), hora: "15:30", corretorId: "u9", imovelRef: "AP-1003", observacoes: "" },
  { id: "v3", leadId: "l8", data: isoDate(3), hora: "09:00", corretorId: "u7", imovelRef: "AP-1001", observacoes: "Segunda visita ao imóvel." },
  { id: "v4", leadId: "l1", data: isoDate(5), hora: "14:00", corretorId: "u3", imovelRef: "AP-1001", observacoes: "" },
]

export const ORIGENS: Origem[] = ["Instagram", "Indicação", "Tráfego Pago", "Outro"]

export function userName(id: string) {
  return USERS.find((u) => u.id === id)?.nome ?? "—"
}

// ---- Logs mock ----
const acoes: ActionType[] = ["criacao", "edicao", "exclusao"]
const entidades: ChangeLog["entidade"][] = ["lead", "imovel", "usuario"]
const campos = ["status", "valorNegociacao", "telefone", "corretorId", "valorTabela", "ativo"]

export const CHANGE_LOGS: ChangeLog[] = Array.from({ length: 34 }).map((_, i) => ({
  id: `cl${i + 1}`,
  dataHora: daysAgo(i % 28),
  usuario: USERS[i % USERS.length].nome,
  acao: acoes[i % acoes.length],
  entidade: entidades[i % entidades.length],
  campo: campos[i % campos.length],
  valorAnterior: i % 3 === 0 ? "novo" : String(400000 + i * 1000),
  valorNovo: i % 3 === 0 ? "negociando" : String(420000 + i * 1000),
}))

const accoesAcesso: AccessAction[] = ["login", "logout", "tentativa falha", "visualizacao lead sensivel"]
export const ACCESS_LOGS: AccessLog[] = Array.from({ length: 32 }).map((_, i) => ({
  id: `al${i + 1}`,
  dataHora: daysAgo(i % 20),
  usuario: USERS[i % USERS.length].nome,
  acao: accoesAcesso[i % accoesAcesso.length],
}))
