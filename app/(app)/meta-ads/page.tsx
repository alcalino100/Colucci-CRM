"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, CircleDollarSign, MessageCircleMore, MousePointerClick, Megaphone, Layers3 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Select, Input } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Account = { id: string; account_id: string | null; name: string | null; status: string | null }
type Campaign = { id: string; nome: string; status: string | null; account_id?: string | null }
type Adset = { id: string; campanha_id: string | null; nome: string; status: string | null }
type Ad = { id: string; campanha_id: string | null; adset_id: string | null; nome: string; status: string | null }
type Insight = { data: string; gasto: number; impressoes: number; cliques: number; mensagens_iniciadas: number; campanha_id?: string | null; adset_id?: string | null; ad_id?: string | null }

const today = new Date().toISOString().slice(0, 10)
const thirty = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10)

export default function MetaAdsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [since, setSince] = useState(thirty)
  const [until, setUntil] = useState(today)
  const [sortBy, setSortBy] = useState<"gasto" | "mensagens" | "cliques">("gasto")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<Adset[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [cIns, setCIns] = useState<Insight[]>([])
  const [aIns, setAIns] = useState<Insight[]>([])
  const [dIns, setDIns] = useState<Insight[]>([])
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({})
  const [openAdsets, setOpenAdsets] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const [acc, c, a, d, ic, ia, id] = await Promise.all([
      supabase.from("meta_ad_accounts").select("id, account_id, name, status").order("name"),
      supabase.from("meta_campanhas").select("id, nome, status, account_id").order("nome"),
      supabase.from("meta_adsets").select("id, campanha_id, nome, status").order("nome"),
      supabase.from("meta_ads").select("id, campanha_id, adset_id, nome, status").order("nome"),
      supabase.from("meta_insights_campaign_daily").select("campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
      supabase.from("meta_insights_adset_daily").select("adset_id, campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
      supabase.from("meta_insights_ad_daily").select("ad_id, adset_id, campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").gte("data", since).lte("data", until),
    ])
    setAccounts((acc.data as Account[]) || [])
    setCampaigns((c.data as Campaign[]) || [])
    setAdsets((a.data as Adset[]) || [])
    setAds((d.data as Ad[]) || [])
    setCIns((ic.data as Insight[]) || [])
    setAIns((ia.data as Insight[]) || [])
    setDIns((id.data as Insight[]) || [])
    if (!accountId && acc.data?.[0]?.account_id) setAccountId(acc.data[0].account_id || "")
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cMap = useMemo(() => groupBy(cIns, x => x.campanha_id || ""), [cIns])
  const aMap = useMemo(() => groupBy(aIns, x => x.adset_id || ""), [aIns])
  const dMap = useMemo(() => groupBy(dIns, x => x.ad_id || ""), [dIns])
  const adsetsByCampaign = useMemo(() => groupBy(adsets, x => x.campanha_id || ""), [adsets])
  const adsByAdset = useMemo(() => groupBy(ads, x => x.adset_id || ""), [ads])

  const filteredCampaigns = useMemo(() => {
    const rows = campaigns.filter(c => !accountId || c.account_id === accountId)
    return rows.map(c => {
      const rows = cMap[c.id] || []
      return { ...c, gasto: sum(rows, x => x.gasto), mensagens: sum(rows, x => x.mensagens_iniciadas), cliques: sum(rows, x => x.cliques), impressoes: sum(rows, x => x.impressoes) }
    }).sort((a: any, b: any) => (b[sortBy] || 0) - (a[sortBy] || 0))
  }, [campaigns, accountId, cMap, sortBy])

  function resCampaign(id: string) { const r = cMap[id] || []; return totals(r) }
  function resAdset(id: string) { const r = aMap[id] || []; return totals(r) }
  function resAd(id: string) { const r = dMap[id] || []; return totals(r) }

  const total = totals(cIns)

  async function sync() {
    setSyncing(true)
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET || ""
    const url = `/api/meta-sync?secret=${encodeURIComponent(secret)}&account_id=${encodeURIComponent(accountId)}&since=${since}&until=${until}&level=campaign`
    const r = await fetch(url, { cache: "no-store" })
    if (r.ok) await load()
    setSyncing(false)
  }

  if (loading) return <Skeleton className="h-96 rounded-2xl" />

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1><p className="text-muted-foreground">Conta + período, com campanhas, conjuntos e anúncios.</p></div>
      <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando..." : "Sincronizar"}</button>
    </div>

    <Card><CardContent className="grid gap-4 p-5 xl:grid-cols-5">
      <Field label="Conta"><Select value={accountId} onValueChange={setAccountId}><option value="">Todas</option>{accounts.map(a => <option key={a.id} value={a.account_id || ""}>{a.name || a.account_id || a.id}</option>)}</Select></Field>
      <Field label="De"><Input type="date" value={since} onChange={e => setSince(e.target.value)} /></Field>
      <Field label="Até"><Input type="date" value={until} onChange={e => setUntil(e.target.value)} /></Field>
      <Field label="Ordenar"><Select value={sortBy} onValueChange={v => setSortBy(v as any)}><option value="gasto">Gasto</option><option value="mensagens">Resultados</option><option value="cliques">Cliques</option></Select></Field>
      <div className="flex items-end"><button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={load}>Aplicar</button></div>
    </CardContent></Card>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={CircleDollarSign} label="Gasto" value={brl(total.gasto)} />
      <Kpi icon={MessageCircleMore} label="Resultados" value={String(total.mensagens)} accent />
      <Kpi icon={MousePointerClick} label="Cliques" value={String(total.cliques)} />
      <Kpi icon={Megaphone} label="Estrutura" value={`${filteredCampaigns.length} campanhas · ${adsets.length} conjuntos · ${ads.length} anúncios`} />
    </div>

    <Card><CardHeader><CardTitle className="text-base">Campanhas</CardTitle></CardHeader><CardContent className="space-y-4">
      {filteredCampaigns.map(c => {
        const r = resCampaign(c.id)
        const childAdsets = (adsetsByCampaign[c.id] || []).sort((x:any,y:any)=> (resAdset(y.id)[sortBy]||0)-(resAdset(x.id)[sortBy]||0))
        const open = !!openCampaigns[c.id]
        return <div key={c.id} className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><CardTitle className="text-base">{c.nome}</CardTitle><div className="flex flex-wrap gap-2"><Badge>{label(c.status)}</Badge><Badge variant="secondary">{childAdsets.length} conjuntos</Badge></div></div><button className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpenCampaigns(p => ({...p,[c.id]:!p[c.id]}))}>{open ? "Ocultar" : "Ver conjuntos"}</button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Mini label="Gasto" value={brl(r.gasto)} /><Mini label="Impressões" value={String(r.impressoes)} /><Mini label="Cliques" value={String(r.cliques)} /><Mini label="Resultados" value={String(r.mensagens)} /></div>
          {open && <div className="space-y-3 border-t pt-4">{childAdsets.length ? childAdsets.map(a => {
            const rr = resAdset(a.id)
            const childAds = (adsByAdset[a.id] || []).sort((x:any,y:any)=> (resAd(y.id)[sortBy]||0)-(resAd(x.id)[sortBy]||0))
            const o = !!openAdsets[a.id]
            return <div key={a.id} className="rounded-xl border bg-background p-4 space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-muted-foreground" /><h3 className="font-medium">{a.nome}</h3></div><div className="flex flex-wrap gap-2"><Badge>{label(a.status)}</Badge><Badge variant="secondary">{childAds.length} anúncios</Badge></div></div><button className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpenAdsets(p => ({...p,[a.id]:!p[a.id]}))}>{o ? "Ocultar" : "Ver anúncios"}</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Mini label="Gasto" value={brl(rr.gasto)} /><Mini label="Impressões" value={String(rr.impressoes)} /><Mini label="Cliques" value={String(rr.cliques)} /><Mini label="Resultados" value={String(rr.mensagens)} /></div>{o && <div className="space-y-3 border-t pt-4">{childAds.map(ad => { const ra = resAd(ad.id); return <div key={ad.id} className="rounded-xl border bg-muted/30 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><h4 className="font-medium">{ad.nome}</h4><Badge>{label(ad.status)}</Badge></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 w-full md:w-auto md:min-w-[520px]"><Mini label="Gasto" value={brl(ra.gasto)} /><Mini label="Impressões" value={String(ra.impressoes)} /><Mini label="Cliques" value={String(ra.cliques)} /><Mini label="Resultados" value={String(ra.mensagens)} /></div></div></div> })}</div>}</div>
          }) : <p className="text-sm text-muted-foreground">Sem conjuntos para esta campanha.</p>}</div>}
        </div>
      })}
    </CardContent></Card>
  </div>
}

function Field({ label, children }: any) { return <div><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>{children}</div> }
function label(status: string | null) { if (!status) return "—"; const s = status.toUpperCase(); if (s === "ACTIVE") return "Ativa"; if (s === "PAUSED") return "Pausada"; if (s === "ARCHIVED") return "Arquivada"; return s }
function sum<T>(arr: T[], pick: (x: T) => number) { return arr.reduce((a, x) => a + Number(pick(x) || 0), 0) }
function totals(arr: any[]) { return { gasto: sum(arr, x => x.gasto), impressoes: sum(arr, x => x.impressoes), cliques: sum(arr, x => x.cliques), mensagens: sum(arr, x => x.mensagens_iniciadas) } }
function groupBy<T>(arr: T[], key: (x: T) => string) { return arr.reduce((m: Record<string, T[]>, x) => ((m[key(x)] ||= []).push(x), m), {}) }
function Kpi({ icon: Icon, label, value, accent }: any) { return <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-2xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p></div><div className="rounded-xl border bg-muted p-2"><Icon className="h-5 w-5 text-muted-foreground" /></div></div></CardContent></Card> }
function Mini({ label, value }: any) { return <div className="rounded-xl border bg-muted/40 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
