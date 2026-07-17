"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, CircleDollarSign, MessageCircleMore, MousePointerClick, Layers3 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useLeads } from "@/lib/leads-store"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Select, Input } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Campanha = { id: string; nome: string; status: string | null; corretor_id: string | null; conta: string | null }
type Adset = { id: string; campanha_id: string; nome: string; status: string | null }
type Ad = { id: string; campanha_id: string; adset_id: string; nome: string; status: string | null }
type Gasto = { chave: string; data: string; gasto: number; impressoes: number; cliques: number; mensagens_iniciadas: number }

const today = new Date().toISOString().slice(0, 10)
const thirty = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10)

function agrega(rows: any[], keyField: string) {
  const m = new Map<string, { gasto: number; impressoes: number; cliques: number; mensagens: number }>()
  rows.forEach((r) => {
    const k = r[keyField]
    const cur = m.get(k) || { gasto: 0, impressoes: 0, cliques: 0, mensagens: 0 }
    cur.gasto += Number(r.gasto || 0)
    cur.impressoes += Number(r.impressoes || 0)
    cur.cliques += Number(r.cliques || 0)
    cur.mensagens += Number(r.mensagens_iniciadas || 0)
    m.set(k, cur)
  })
  return m
}

export default function MetaAdsPage() {
  const { userName } = useLeads()
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [adsets, setAdsets] = useState<Adset[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [gastosCamp, setGastosCamp] = useState<any[]>([])
  const [gastosAdset, setGastosAdset] = useState<any[]>([])
  const [gastosAd, setGastosAd] = useState<any[]>([])
  const [contas, setContas] = useState<string[]>([])
  const [contaSelecionada, setContaSelecionada] = useState("")
  const [inicializado, setInicializado] = useState(false)
  const [since, setSince] = useState(thirty)
  const [until, setUntil] = useState(today)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [openCampanhas, setOpenCampanhas] = useState<Record<string, boolean>>({})
  const [openAdsets, setOpenAdsets] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const [c, a, d, gc, ga, gd] = await Promise.all([
      supabase.from("meta_campanhas").select("id, nome, status, corretor_id, conta"),
      supabase.from("meta_adsets").select("id, campanha_id, nome, status"),
      supabase.from("meta_ads").select("id, campanha_id, adset_id, nome, status"),
      supabase.from("meta_insights_campaign_daily").select("campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
      supabase.from("meta_insights_adset_daily").select("adset_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
      supabase.from("meta_insights_ad_daily").select("ad_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
    ])
    const camp = (c.data as Campanha[]) || []
    setCampanhas(camp)
    setAdsets((a.data as Adset[]) || [])
    setAds((d.data as Ad[]) || [])
    setGastosCamp(gc.data || [])
    setGastosAdset(ga.data || [])
    setGastosAd(gd.data || [])

    const contasUnicas = [...new Set(camp.map((x) => x.conta).filter(Boolean))] as string[]
    setContas(contasUnicas)
    if (!inicializado && contasUnicas.length) {
      setContaSelecionada(contasUnicas[0])
      setInicializado(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [since, until])

  const campanhasFiltradas = useMemo(() => campanhas.filter((c) => !contaSelecionada || c.conta === contaSelecionada), [campanhas, contaSelecionada])
  const idsCampFiltradas = useMemo(() => new Set(campanhasFiltradas.map((c) => c.id)), [campanhasFiltradas])

  const adsetsFiltrados = useMemo(() => adsets.filter((a) => idsCampFiltradas.has(a.campanha_id)), [adsets, idsCampFiltradas])
  const adsFiltrados = useMemo(() => ads.filter((a) => idsCampFiltradas.has(a.campanha_id)), [ads, idsCampFiltradas])

  const mapaGastoCamp = useMemo(() => agrega(gastosCamp.map((g) => ({ ...g, chave: g.campanha_id })), "campanha_id"), [gastosCamp])
  const mapaGastoAdset = useMemo(() => agrega(gastosAdset.map((g) => ({ ...g, chave: g.adset_id })), "adset_id"), [gastosAdset])
  const mapaGastoAd = useMemo(() => agrega(gastosAd.map((g) => ({ ...g, chave: g.ad_id })), "ad_id"), [gastosAd])

  const adsetsPorCampanha = useMemo(() => {
    const m = new Map<string, Adset[]>()
    adsetsFiltrados.forEach((a) => { const arr = m.get(a.campanha_id) || []; arr.push(a); m.set(a.campanha_id, arr) })
    return m
  }, [adsetsFiltrados])

  const adsPorAdset = useMemo(() => {
    const m = new Map<string, Ad[]>()
    adsFiltrados.forEach((a) => { const arr = m.get(a.adset_id) || []; arr.push(a); m.set(a.adset_id, arr) })
    return m
  }, [adsFiltrados])

  const total = useMemo(() => {
    let gasto = 0, cliques = 0, mensagens = 0, impressoes = 0
    campanhasFiltradas.forEach((c) => {
      const g = mapaGastoCamp.get(c.id)
      if (g) { gasto += g.gasto; cliques += g.cliques; mensagens += g.mensagens; impressoes += g.impressoes }
    })
    return { gasto, cliques, mensagens, impressoes }
  }, [campanhasFiltradas, mapaGastoCamp])

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

  if (loading) return <Skeleton className="h-96 rounded-2xl" />

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1><p className="text-muted-foreground">Campanha → conjunto → anúncio, com dados reais do Meta.</p></div>
      <button onClick={sincronizar} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted shrink-0">
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </div>

    <Card><CardContent className="grid gap-4 p-5 xl:grid-cols-4">
      <div className="min-w-0">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Conta</p>
        <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
          {contas.length === 0 && <option value="">Nenhuma conta encontrada</option>}
          {contas.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="min-w-0"><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">De</p><Input type="date" value={since} onChange={(e) => setSince(e.target.value)} /></div>
      <div className="min-w-0"><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Até</p><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
      <div className="flex items-end"><button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={load}>Aplicar filtro</button></div>
    </CardContent></Card>

    {msg && <Card><CardContent className="p-4 text-sm text-muted-foreground">{msg}</CardContent></Card>}

    <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
      <Kpi icon={CircleDollarSign} label="Gasto" value={brl(total.gasto)} accent />
      <Kpi icon={MessageCircleMore} label="Resultados" value={String(total.mensagens)} />
      <Kpi icon={MousePointerClick} label="Cliques" value={String(total.cliques)} />
      <Kpi icon={Layers3} label="Estrutura" value={`${campanhasFiltradas.length} camp · ${adsetsFiltrados.length} conj · ${adsFiltrados.length} anún`} />
    </div>

    <Card><CardHeader><CardTitle className="text-base">Campanhas</CardTitle></CardHeader><CardContent className="space-y-3">
      {campanhasFiltradas.length === 0 ? <p className="text-sm text-muted-foreground">Sem campanhas para esta conta/período.</p> : campanhasFiltradas.map((c) => {
        const g = mapaGastoCamp.get(c.id) || { gasto: 0, cliques: 0, mensagens: 0, impressoes: 0 }
        const filhos = adsetsPorCampanha.get(c.id) || []
        const aberto = !!openCampanhas[c.id]
        return <div key={c.id} className="rounded-xl border p-4 space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium truncate">{c.nome}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{(c.status ?? "—").toUpperCase() === "ACTIVE" ? "Ativa" : (c.status ?? "—")}</Badge>
                <Badge variant="secondary">{filhos.length} conjuntos</Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-semibold whitespace-nowrap">{brl(g.gasto)}</span>
              <button className="rounded-lg border px-2 py-1 text-xs hover:bg-muted shrink-0" onClick={() => setOpenCampanhas((p) => ({ ...p, [c.id]: !p[c.id] }))}>
                {aberto ? "Ocultar" : "Ver conjuntos"}
              </button>
            </div>
          </div>

          {aberto && <div className="space-y-3 border-t pt-3">
            {filhos.length === 0 ? <p className="text-sm text-muted-foreground">Sem conjuntos para esta campanha.</p> : filhos.map((a) => {
              const ga = mapaGastoAdset.get(a.id) || { gasto: 0, cliques: 0, mensagens: 0, impressoes: 0 }
              const netos = adsPorAdset.get(a.id) || []
              const abertoAdset = !!openAdsets[a.id]
              return <div key={a.id} className="rounded-lg border bg-muted/20 p-3 space-y-3 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium truncate">{a.nome}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{(a.status ?? "—").toUpperCase() === "ACTIVE" ? "Ativa" : (a.status ?? "—")}</Badge>
                      <Badge variant="secondary">{netos.length} anúncios</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold whitespace-nowrap">{brl(ga.gasto)}</span>
                    <button className="rounded-lg border px-2 py-1 text-xs hover:bg-muted shrink-0" onClick={() => setOpenAdsets((p) => ({ ...p, [a.id]: !p[a.id] }))}>
                      {abertoAdset ? "Ocultar" : "Ver anúncios"}
                    </button>
                  </div>
                </div>

                {abertoAdset && <div className="space-y-2 border-t pt-2">
                  {netos.length === 0 ? <p className="text-xs text-muted-foreground">Sem anúncios para este conjunto.</p> : netos.map((ad) => {
                    const gad = mapaGastoAd.get(ad.id) || { gasto: 0, cliques: 0, mensagens: 0, impressoes: 0 }
                    return <div key={ad.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-2">
                      <p className="min-w-0 flex-1 truncate text-xs">{ad.nome}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge>{(ad.status ?? "—").toUpperCase() === "ACTIVE" ? "Ativo" : (ad.status ?? "—")}</Badge>
                        <span className="text-xs font-semibold whitespace-nowrap">{brl(gad.gasto)}</span>
                      </div>
                    </div>
                  })}
                </div>}
              </div>
            })}
          </div>}
        </div>
      })}
    </CardContent></Card>
  </div>
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return <Card><CardContent className="p-4 md:p-5"><div className="flex items-start justify-between gap-2">
    <div className="min-w-0 space-y-1"><p className="text-xs md:text-sm text-muted-foreground truncate">{label}</p><p className={`text-lg md:text-2xl font-semibold tracking-tight truncate ${accent ? "text-primary" : ""}`}>{value}</p></div>
    <div className="rounded-xl border bg-muted p-2 shrink-0"><Icon className="h-5 w-5 text-muted-foreground" /></div>
  </div></CardContent></Card>
}
