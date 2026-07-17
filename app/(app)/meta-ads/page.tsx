"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { RefreshCw, CircleDollarSign, Activity, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useLeads } from "@/lib/leads-store"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Select, Input } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Campanha = { id: string; nome: string; status: string | null; corretor_id: string | null; conta: string | null }
type Gasto = { campanha_id: string; data: string; gasto: number; impressoes: number; cliques: number }

const today = new Date().toISOString().slice(0, 10)
const thirty = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10)

export default function MetaAdsPage() {
  const { userName } = useLeads()
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [contas, setContas] = useState<string[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<string>("")
  const [since, setSince] = useState(thirty)
  const [until, setUntil] = useState(today)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [inicializado, setInicializado] = useState(false)

  async function load() {
    setLoading(true)
    const [c, g] = await Promise.all([
      supabase.from("meta_campanhas").select("id, nome, status, corretor_id, conta"),
      supabase.from("meta_gastos_diarios").select("campanha_id, data, gasto, impressoes, cliques").gte("data", since).lte("data", until).order("data"),
    ])
    const camp = (c.data as Campanha[]) || []
    setCampanhas(camp)
    setGastos((g.data as Gasto[]) || [])

    const contasUnicas = [...new Set(camp.map((x) => x.conta).filter(Boolean))] as string[]
    setContas(contasUnicas)

    // só define a conta padrão UMA vez, nunca sobrescreve escolha do usuário depois
    if (!inicializado && contasUnicas.length) {
      setContaSelecionada(contasUnicas[0])
      setInicializado(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [since, until])

  const campanhasFiltradas = useMemo(
    () => campanhas.filter((c) => !contaSelecionada || c.conta === contaSelecionada),
    [campanhas, contaSelecionada]
  )
  const idsFiltrados = useMemo(() => new Set(campanhasFiltradas.map((c) => c.id)), [campanhasFiltradas])
  const gastosFiltrados = useMemo(() => gastos.filter((g) => idsFiltrados.has(g.campanha_id)), [gastos, idsFiltrados])

  const kpis = useMemo(() => {
    const total = gastosFiltrados.reduce((s, g) => s + Number(g.gasto), 0)
    const ativas = campanhasFiltradas.filter((c) => (c.status ?? "").toUpperCase() === "ACTIVE").length
    const cliques = gastosFiltrados.reduce((s, g) => s + Number(g.cliques), 0)
    return { total, ativas, cliques, nCamp: campanhasFiltradas.length }
  }, [gastosFiltrados, campanhasFiltradas])

  const porDia = useMemo(() => {
    const m = new Map<string, number>()
    gastosFiltrados.forEach((g) => m.set(g.data, (m.get(g.data) ?? 0) + Number(g.gasto)))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([data, gasto]) => ({ dia: data.slice(5), gasto: Number(gasto.toFixed(2)) }))
  }, [gastosFiltrados])

  const gastoCampanha = useMemo(() => {
    const m = new Map<string, number>()
    gastosFiltrados.forEach((g) => m.set(g.campanha_id, (m.get(g.campanha_id) ?? 0) + Number(g.gasto)))
    return m
  }, [gastosFiltrados])

  async function sincronizar() {
    if (!contaSelecionada) { setMsg("Escolha uma conta antes de sincronizar."); return }
    setSyncing(true)
    setMsg(null)
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET || ""
    const accountId = contaSelecionada.replace("act_", "")
    const url = `/api/meta-sync?secret=${encodeURIComponent(secret)}&account_id=${encodeURIComponent(accountId)}&since=${since}&until=${until}`
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    if (!r.ok) setMsg(j?.erro || "Falha na sincronização")
    await load()
    setSyncing(false)
  }

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1><p className="text-muted-foreground">Campanhas, gastos e desempenho por corretor.</p></div>
      <button onClick={sincronizar} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </div>

    <Card><CardContent className="grid gap-4 p-5 xl:grid-cols-4">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Conta</p>
        <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
          {contas.length === 0 && <option value="">Nenhuma conta encontrada</option>}
          {contas.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">De</p><Input type="date" value={since} onChange={(e) => setSince(e.target.value)} /></div>
      <div><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Até</p><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
      <div className="flex items-end"><button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={load}>Aplicar filtro</button></div>
    </CardContent></Card>

    {msg && <Card><CardContent className="p-4 text-sm text-muted-foreground">{msg}</CardContent></Card>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={CircleDollarSign} label="Gasto" value={brl(kpis.total)} accent />
      <Kpi icon={Activity} label="Campanhas ativas" value={String(kpis.ativas)} />
      <Kpi icon={Users} label="Cliques" value={String(kpis.cliques)} />
      <Kpi icon={CircleDollarSign} label="Total de campanhas" value={String(kpis.nCamp)} />
    </div>

    <Card><CardHeader><CardTitle className="text-base">Gasto por dia</CardTitle></CardHeader><CardContent className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={porDia}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dia" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={(v) => brl(Number(v))} />
          <Bar dataKey="gasto" fill="currentColor" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Campanhas</CardTitle></CardHeader><CardContent className="space-y-2">
      {campanhasFiltradas.length === 0 ? <p className="text-sm text-muted-foreground">Sem campanhas para esta conta/período.</p> : campanhasFiltradas.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-1">
            <p className="font-medium">{c.nome}</p>
            <p className="text-xs text-muted-foreground">{c.corretor_id ? userName(c.corretor_id) : "Sem corretor"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge>{(c.status ?? "—").toUpperCase() === "ACTIVE" ? "Ativa" : (c.status ?? "—")}</Badge>
            <span className="font-semibold">{brl(gastoCampanha.get(c.id) ?? 0)}</span>
          </div>
        </div>
      ))}
    </CardContent></Card>
  </div>
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3">
    <div className="space-y-1"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-2xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p></div>
    <div className="rounded-xl border bg-muted p-2"><Icon className="h-5 w-5 text-muted-foreground" /></div>
  </div></CardContent></Card>
}
