"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, CircleDollarSign, MessageCircleMore, MousePointerClick, Megaphone, Layers3 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Select, Input } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Account = { id: string; conta: string | null; nome: string | null; status: string | null }
type Campaign = { campanha_id: string; conta: string | null; nome: string; status: string | null; gasto: number; impressoes: number; cliques: number; mensagens: number }
type Adset = { adset_id: string; campanha_id: string | null; nome: string; status: string | null; gasto: number; impressoes: number; cliques: number; mensagens: number }
type Ad = { ad_id: string; campanha_id: string | null; adset_id: string | null; nome: string; status: string | null; gasto: number; impressoes: number; cliques: number; mensagens: number }

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
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({})
  const [openAdsets, setOpenAdsets] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setMsg(null)
    const [acc, c, a, d] = await Promise.all([
      supabase.from("meta_campanhas").select("id, conta, nome, status").order("nome"),
      supabase.from("v_meta_campaign_totals").select("campanha_id, conta, nome, status, gasto, impressoes, cliques, mensagens").order("nome"),
      supabase.from("v_meta_adset_totals").select("adset_id, campanha_id, nome, status, gasto, impressoes, cliques, mensagens").order("nome"),
      supabase.from("v_meta_ad_totals").select("ad_id, campanha_id, adset_id, nome, status, gasto, impressoes, cliques, mensagens").order("nome"),
    ])
    setAccounts((acc.data as Account[]) || [])
    setCampaigns((c.data as Campaign[]) || [])
    setAdsets((a.data as Adset[]) || [])
    setAds((d.data as Ad[]) || [])
    if (!accountId && acc.data?.[0]?.conta) setAccountId(acc.data[0].conta || "")
    if (!(acc.data?.length || c.data?.length || a.data?.length || d.data?.length)) setMsg("Sem dados para a seleção atual.")
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredCampaigns = useMemo(() => campaigns.filter(c => !accountId || c.conta === accountId).sort((a: any, b: any) => (b[sortBy] || 0) - (a[sortBy] || 0)), [campaigns, accountId, sortBy])
  const adsetsByCampaign = useMemo(() => groupBy(adsets, x => x.campanha_id || ""), [adsets])
  const adsByAdset = useMemo(() => groupBy(ads, x => x.adset_id || ""), [ads])
  const total = useMemo(() => ({ gasto: sum(filteredCampaigns, x => x.gasto), impressoes: sum(filteredCampaigns, x => x.impressoes), cliques: sum(filteredCampaigns, x => x.cliques), mensagens: sum(filteredCampaigns, x => x.mensagens) }), [filteredCampaigns])

  async function sync() {
    if (!accountId) { setMsg("Escolha uma conta antes de sincronizar."); return }
    setSyncing(true)
    setMsg(null)
    const secret = process.env.NEXT_PUBLIC_CRON_SECRET || ""
    const url = `/api/meta-sync?secret=${encodeURIComponent(secret)}&account_id=${encodeURIComponent(accountId)}&since=${since}&until=${until}&level=campaign`
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    if (!r.ok) setMsg(j?.error || "Falha na sincronização")
    await load()
    setSyncing(false)
  }

  if (loading) return <Skeleton className="h-96 rounded-2xl" />

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1><p className="text-muted-foreground">Conta + período, com campanhas, conjuntos e anúncios.</p></div>
      <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando..." : "Sincronizar"}</button>
    </div>

    <Card><CardContent className="grid gap-4 p-5 xl:grid-cols-5">
      <Field label="Conta"><Select value={accountId} onValueChange={setAccountId}><option value="">Todas</option>{accounts.map(a => <option key={a.id} value={a.conta || ""}>{a.nome || a.conta || a.id}</option>)}</Select></Field>
      <Field label="De"><Input type="date" value={since} onChange={e => setSince(e.target.value)} /></Field>
      <Field label="Até"><Input type="date" value={until} onChange={e => setUntil(e.target.value)} /></Field>
      <Field label="Ordenar"><Select value={sortBy} onValueChange={v => setSortBy(v as any)}><option value="gasto">Gasto</option><option value="mensagens">Resultados</option><option value="cliques">Cliques</option></Select></Field>
      <div className="flex items-end"><button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={load}>Aplicar</button></div>
    </CardContent></Card>

    {msg && <Card><CardContent className="p-4 text-sm text-muted-foreground">{msg}</CardContent></Card>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={CircleDollarSign} label="Gasto" value={brl(total.gasto)} />
      <Kpi icon={MessageCircleMore} label="Resultados" value={String(total.mensagens)} accent />
      <Kpi icon={MousePointerClick} label="Cliques" value={String(total.cliques)} />
      <Kpi icon={Megaphone} label="Estrutura" value={`${filteredCampaigns.length} campanhas · ${adsets.length} conjuntos · ${ads.length} anúncios`} />
    </div>

    <Card><CardHeader><CardTitle className="text-base">Campanhas</CardTitle></CardHeader><CardContent className="space-y-4">
      {filteredCampaigns.length === 0 ? <p className="text-sm text-muted-foreground">Sem campanhas para essa conta/período.</p> : filteredCampaigns.map(c => {
        const childAdsets = (adsetsByCampaign[c.campanha_id] || []).sort((x:any,y:any)=> (y[sortBy]||0)-(x[sortBy]||0))
        const open = !!openCampaigns[c.campanha_id]
        return <div key={c.campanha_id} className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><CardTitle className="text-base">{c.nome}</CardTitle><div className="flex flex-wrap gap-2"><Badge>{label(c.status)}</Badge><Badge variant="secondary">{childAdsets.length} conjuntos</Badge></div></div><button className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpenCampaigns(p => ({...p,[c.campanha_id]:!p[c.campanha_id]}))}>{open ? "Ocultar" : "Ver conjuntos"}</button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Mini label="Gasto" value={brl(c.gasto)} /><Mini label="Impressões" value={String(c.impressoes)} /><Mini label="Cliques" value={String(c.cliques)} /><Mini label="Resultados" value={String(c.mensagens)} /></div>
          {open && <div className="space-y-3 border-t pt-4">{childAdsets.length ? childAdsets.map(a => {
            const childAds = (adsByAdset[a.adset_id] || []).sort((x:any,y:any)=> (y[sortBy]||0)-(x[sortBy]||0))
            const o = !!openAdsets[a.adset_id]
            return <div key={a.adset_id} className="rounded-xl border bg-background p-4 space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-muted-foreground" /><h3 className="font-medium">{a.nome}</h3></div><div className="flex flex-wrap gap-2"><Badge>{label(a.status)}</Badge><Badge variant="secondary">{childAds.length} anúncios</Badge></div></div><button className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpenAdsets(p => ({...p,[a.adset_id]:!p[a.adset_id]}))}>{o ? "Ocultar" : "Ver anúncios"}</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Mini label="Gasto" value={brl(a.gasto)} /><Mini label="Impressões" value={String(a.impressoes)} /><Mini label="Cliques" value={String(a.cliques)} /><Mini label="Resultados" value={String(a.mensagens)} /></div>{o && <div className="space-y-3 border-t pt-4">{childAds.length ? childAds.map(ad => <div key={ad.ad_id} className="rounded-xl border bg-muted/30 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><h4 className="font-medium">{ad.nome}</h4><Badge>{label(ad.status)}</Badge></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 w-full md:w-auto md:min-w-[520px]"><Mini label="Gasto" value={brl(ad.gasto)} /><Mini label="Impressões" value={String(ad.impressoes)} /><Mini label="Cliques" value={String(ad.cliques)} /><Mini label="Resultados" value={String(ad.mensagens)} /></div></div></div>) : <p className="text-sm text-muted-foreground">Sem anúncios para este conjunto.</p>}</div>}</div>
          }) : <p className="text-sm text-muted-foreground">Sem conjuntos para esta campanha.</p>}</div>}
        </div>
      })}
    </CardContent></Card>
  </div>
}

function Field({ label, children }: any) { return <div><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>{children}</div> }
function label(status: string | null) { if (!status) return "—"; const s = status.toUpperCase(); if (s === "ACTIVE") return "Ativa"; if (s === "PAUSED") return "Pausada"; if (s === "ARCHIVED") return "Arquivada"; return s }
function sum<T>(arr: T[], pick: (x: T) => number) { return arr.reduce((a, x) => a + Number(pick(x) || 0), 0) }
function groupBy<T>(arr: T[], key: (x: T) => string) { return arr.reduce((m: Record<string, T[]>, x) => ((m[key(x)] ||= []).push(x), m), {}) }
function Kpi({ icon: Icon, label, value, accent }: any) { return <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-2xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p></div><div className="rounded-xl border bg-muted p-2"><Icon className="h-5 w-5 text-muted-foreground" /></div></div></CardContent></Card> }
function Mini({ label, value }: any) { return <div className="rounded-xl border bg-muted/40 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
