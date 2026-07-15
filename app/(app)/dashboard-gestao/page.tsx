"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Search, TrendingUp, Users, Handshake, Wallet } from "lucide-react"
import { useLeads } from "@/lib/leads-store"
import { LeadForm, type LeadFormValues } from "@/components/lead-form"
import { Button } from "@/components/ui/button"
import { Badge, Card, CardContent, CardHeader, CardTitle, Dialog, Input, Select, Skeleton, Table, TD, TH, THead, TR, useToast } from "@/components/ui/primitives"
import { brl, fmtDate, LEAD_STATUSES, STATUS_LABEL, STATUS_VARIANT } from "@/lib/labels"
import { CORRETORES, userName, type Lead } from "@/lib/mock-data"

const CHART = ["#0f4c5c", "#d97706", "#334155", "#0e7490", "#94a3b8"]

export default function DashboardGestaoPage() {
  const { leads, updateLead } = useLeads()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [fCorretor, setFCorretor] = useState("todos")
  const [fStatus, setFStatus] = useState("todos")
  const [fPeriodo, setFPeriodo] = useState("30")
  const [editing, setEditing] = useState<Lead | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  const ativos = leads.filter((l) => l.status !== "fechado" && l.status !== "perdido")
  const negociando = leads.filter((l) => l.status === "negociando")
  const valorTotal = negociando.reduce((s, l) => s + (l.valorNegociacao ?? 0), 0)
  const fechados = leads.filter((l) => l.status === "fechado").length
  const taxa = leads.length ? Math.round((fechados / leads.length) * 100) : 0

  const porCorretor = CORRETORES.map((c) => ({ nome: c.nome.split(" ")[0], leads: leads.filter((l) => l.corretorId === c.id).length }))

  const porStatus = LEAD_STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: leads.filter((l) => l.status === s).length })).filter((x) => x.value > 0)

  const evolucao = useMemo(() => {
    const days = Number(fPeriodo)
    const arr: { dia: string; leads: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const count = leads.filter((l) => { const c = new Date(l.criadoEm); return c >= d && c < next }).length
      arr.push({ dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), leads: count })
    }
    return arr
  }, [leads, fPeriodo])

  const filtered = useMemo(() => {
    const limite = new Date(); limite.setDate(limite.getDate() - Number(fPeriodo))
    return leads.filter((l) => {
      const mq = `${l.nome} ${l.telefone}`.toLowerCase().includes(q.toLowerCase())
      const mc = fCorretor === "todos" || l.corretorId === fCorretor
      const ms = fStatus === "todos" || l.status === fStatus
      const mp = new Date(l.criadoEm) >= limite
      return mq && mc && ms && mp
    })
  }, [leads, q, fCorretor, fStatus, fPeriodo])

  const semDados = evolucao.every((e) => e.leads === 0)

  function handleEdit(v: LeadFormValues) {
    updateLead(editing!.id, v)
    setEditing(null)
    toast("Lead atualizado.")
  }

  const kpis = [
    { label: "Leads ativos", value: ativos.length, icon: Users },
    { label: "Negociações em andamento", value: negociando.length, icon: Handshake },
    { label: "Valor em negociação", value: brl(valorTotal), icon: Wallet },
    { label: "Taxa de conversão", value: `${taxa}%`, icon: TrendingUp },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard de Gestão</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada de todos os corretores.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          : kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold">{k.value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><k.icon className="size-5" /></div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Leads por corretor" loading={loading}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porCorretor}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="nome" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="leads" fill="#0f4c5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição por status" loading={loading}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {porStatus.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Leads criados (últimos ${fPeriodo} dias)`} loading={loading} className="lg:col-span-2">
          {semDados ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Sem dados no período selecionado.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#d97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Todos os contatos */}
      <Card>
        <CardHeader><CardTitle>Todos os contatos</CardTitle></CardHeader>
        <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:flex-wrap">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" aria-label="Buscar" />
          </div>
          <Select value={fCorretor} onChange={(e) => setFCorretor(e.target.value)} aria-label="Filtrar corretor" className="sm:w-44">
            <option value="todos">Todos corretores</option>
            {CORRETORES.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filtrar status" className="sm:w-44">
            <option value="todos">Todos status</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
          <Select value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value)} aria-label="Filtrar período" className="sm:w-40">
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </Select>
        </div>
        {loading ? (
          <div className="flex flex-col gap-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">Nenhum lead encontrado para os filtros selecionados.</p>
        ) : (
          <Table>
            <THead>
              <TR><TH>Nome</TH><TH>Corretor</TH><TH>Imóvel</TH><TH>Status</TH><TH>Valor</TH><TH>Atualizado</TH><TH>Ações</TH></TR>
            </THead>
            <tbody>
              {filtered.map((l) => (
                <TR key={l.id}>
                  <TD className="font-medium">{l.nome}</TD>
                  <TD className="text-muted-foreground">{userName(l.corretorId)}</TD>
                  <TD className="text-muted-foreground">{l.imovelRef || "—"}</TD>
                  <TD><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></TD>
                  <TD>{brl(l.valorNegociacao)}</TD>
                  <TD className="text-muted-foreground">{fmtDate(l.atualizadoEm)}</TD>
                  <TD><Button variant="outline" size="sm" onClick={() => setEditing(l)}>Editar</Button></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar lead">
        {editing && <LeadForm initial={editing} defaultCorretorId={editing.corretorId} showCorretor onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Dialog>
    </div>
  )
}

function ChartCard({ title, children, loading, className }: { title: string; children: React.ReactNode; loading: boolean; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{loading ? <Skeleton className="h-[260px] w-full" /> : children}</CardContent>
    </Card>
  )
}
