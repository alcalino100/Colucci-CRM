"use client"

import { useEffect, useMemo, useState } from "react"
import { CircleDollarSign, Layers3, Megaphone, MessageCircleMore, MousePointerClick } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Campanha = { id: string; nome: string; status: string | null }
type Adset = { id: string; campanha_id: string | null; nome: string; status: string | null }
type Ad = { id: string; campanha_id: string | null; adset_id: string | null; nome: string; status: string | null }

type InsightCampaign = {
  campanha_id: string
  data: string
  gasto: number
  impressoes: number
  cliques: number
  mensagens_iniciadas: number
}

type InsightAdset = {
  adset_id: string
  campanha_id: string | null
  data: string
  gasto: number
  impressoes: number
  cliques: number
  mensagens_iniciadas: number
}

type InsightAd = {
  ad_id: string
  adset_id: string | null
  campanha_id: string | null
  data: string
  gasto: number
  impressoes: number
  cliques: number
  mensagens_iniciadas: number
}

function soma<T>(arr: T[], pick: (item: T) => number) {
  return arr.reduce((s, item) => s + Number(pick(item) || 0), 0)
}

function statusLabel(status: string | null) {
  if (!status) return "—"
  const s = status.toUpperCase()
  if (s === "ACTIVE") return "Ativa"
  if (s === "PAUSED") return "Pausada"
  if (s === "ARCHIVED") return "Arquivada"
  return s
}

export default function MetaAdsPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [adsets, setAdsets] = useState<Adset[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [insCampaign, setInsCampaign] = useState<InsightCampaign[]>([])
  const [insAdset, setInsAdset] = useState<InsightAdset[]>([])
  const [insAd, setInsAd] = useState<InsightAd[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({})
  const [expandedAdsets, setExpandedAdsets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    ;(async () => {
      const [c, a, d, ic, ia, idd] = await Promise.all([
        supabase.from("meta_campanhas").select("id, nome, status").order("nome"),
        supabase.from("meta_adsets").select("id, campanha_id, nome, status").order("nome"),
        supabase.from("meta_ads").select("id, campanha_id, adset_id, nome, status").order("nome"),
        supabase.from("meta_insights_campaign_daily").select("campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").order("data"),
        supabase.from("meta_insights_adset_daily").select("adset_id, campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").order("data"),
        supabase.from("meta_insights_ad_daily").select("ad_id, adset_id, campanha_id, data, gasto, impressoes, cliques, mensagens_iniciadas").order("data"),
      ])

      if (c.data) setCampanhas(c.data as Campanha[])
      if (a.data) setAdsets(a.data as Adset[])
      if (d.data) setAds(d.data as Ad[])
      if (ic.data) setInsCampaign(ic.data as InsightCampaign[])
      if (ia.data) setInsAdset(ia.data as InsightAdset[])
      if (idd.data) setInsAd(idd.data as InsightAd[])
      setLoading(false)
    })()
  }, [])

  const kpis = useMemo(() => {
    return {
      gasto: soma(insCampaign, (i) => i.gasto),
      mensagens: soma(insCampaign, (i) => i.mensagens_iniciadas),
      cliques: soma(insCampaign, (i) => i.cliques),
      campanhas: campanhas.length,
      adsets: adsets.length,
      ads: ads.length,
    }
  }, [campanhas, adsets, ads, insCampaign])

  const insCampaignMap = useMemo(() => {
    const m = new Map<string, InsightCampaign[]>()
    insCampaign.forEach((row) => {
      const list = m.get(row.campanha_id) ?? []
      list.push(row)
      m.set(row.campanha_id, list)
    })
    return m
  }, [insCampaign])

  const insAdsetMap = useMemo(() => {
    const m = new Map<string, InsightAdset[]>()
    insAdset.forEach((row) => {
      const list = m.get(row.adset_id) ?? []
      list.push(row)
      m.set(row.adset_id, list)
    })
    return m
  }, [insAdset])

  const insAdMap = useMemo(() => {
    const m = new Map<string, InsightAd[]>()
    insAd.forEach((row) => {
      const list = m.get(row.ad_id) ?? []
      list.push(row)
      m.set(row.ad_id, list)
    })
    return m
  }, [insAd])

  const adsetsByCampaign = useMemo(() => {
    const m = new Map<string, Adset[]>()
    adsets.forEach((a) => {
      if (!a.campanha_id) return
      const list = m.get(a.campanha_id) ?? []
      list.push(a)
      m.set(a.campanha_id, list)
    })
    return m
  }, [adsets])

  const adsByAdset = useMemo(() => {
    const m = new Map<string, Ad[]>()
    ads.forEach((a) => {
      if (!a.adset_id) return
      const list = m.get(a.adset_id) ?? []
      list.push(a)
      m.set(a.adset_id, list)
    })
    return m
  }, [ads])

  const porDia = useMemo(() => {
    const m = new Map<string, number>()
    insCampaign.forEach((row) => {
      m.set(row.data, (m.get(row.data) ?? 0) + Number(row.gasto || 0))
    })
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, gasto]) => ({ dia: data.slice(5), gasto }))
  }, [insCampaign])

  function resumoCampanha(id: string) {
    const rows = insCampaignMap.get(id) ?? []
    return {
      gasto: soma(rows, (r) => r.gasto),
      impressoes: soma(rows, (r) => r.impressoes),
      cliques: soma(rows, (r) => r.cliques),
      mensagens: soma(rows, (r) => r.mensagens_iniciadas),
    }
  }

  function resumoAdset(id: string) {
    const rows = insAdsetMap.get(id) ?? []
    return {
      gasto: soma(rows, (r) => r.gasto),
      impressoes: soma(rows, (r) => r.impressoes),
      cliques: soma(rows, (r) => r.cliques),
      mensagens: soma(rows, (r) => r.mensagens_iniciadas),
    }
  }

  function resumoAd(id: string) {
    const rows = insAdMap.get(id) ?? []
    return {
      gasto: soma(rows, (r) => r.gasto),
      impressoes: soma(rows, (r) => r.impressoes),
      cliques: soma(rows, (r) => r.cliques),
      mensagens: soma(rows, (r) => r.mensagens_iniciadas),
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="text-muted-foreground">Campanhas, conjuntos e anúncios com métricas de mensagens.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  const vazio = campanhas.length === 0 && adsets.length === 0 && ads.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1>
        <p className="text-muted-foreground">Visualização de campanhas, conjuntos e anúncios com gastos, cliques e mensagens iniciadas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CircleDollarSign} label="Gasto total" value={brl(kpis.gasto)} />
        <Kpi icon={MessageCircleMore} label="Mensagens iniciadas" value={String(kpis.mensagens)} accent />
        <Kpi icon={MousePointerClick} label="Cliques" value={String(kpis.cliques)} />
        <Kpi icon={Megaphone} label="Estrutura" value={`${kpis.campanhas} campanhas · ${kpis.adsets} conjuntos · ${kpis.ads} anúncios`} />
      </div>

      {vazio ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Ainda não há dados do Meta sincronizados. Rode a rota manualmente para popular as tabelas novas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campanhas.map((campanha) => {
            const rCamp = resumoCampanha(campanha.id)
            const filhosAdsets = adsetsByCampaign.get(campanha.id) ?? []
            const isExpanded = !!expandedCampaigns[campanha.id]

            return (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-base">{campanha.nome}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{statusLabel(campanha.status)}</Badge>
                        <Badge variant="secondary">{filhosAdsets.length} conjuntos</Badge>
                      </div>
                    </div>
                    <button
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setExpandedCampaigns((prev) => ({ ...prev, [campanha.id]: !prev[campanha.id] }))}
                    >
                      {isExpanded ? "Ocultar conjuntos" : "Ver conjuntos"}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MiniStat label="Gasto" value={brl(rCamp.gasto)} />
                    <MiniStat label="Impressões" value={String(rCamp.impressoes)} />
                    <MiniStat label="Cliques" value={String(rCamp.cliques)} />
                    <MiniStat label="Mensagens" value={String(rCamp.mensagens)} />
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t pt-4">
                      {filhosAdsets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum conjunto encontrado para esta campanha.</p>
                      ) : (
                        filhosAdsets.map((adset) => {
                          const rAdset = resumoAdset(adset.id)
                          const filhosAds = adsByAdset.get(adset.id) ?? []
                          const isAdsetExpanded = !!expandedAdsets[adset.id]

                          return (
                            <div key={adset.id} className="rounded-xl border bg-card p-4 space-y-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Layers3 className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-medium">{adset.nome}</h3>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge>{statusLabel(adset.status)}</Badge>
                                    <Badge variant="secondary">{filhosAds.length} anúncios</Badge>
                                  </div>
                                </div>
                                <button
                                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                                  onClick={() => setExpandedAdsets((prev) => ({ ...prev, [adset.id]: !prev[adset.id] }))}
                                >
                                  {isAdsetExpanded ? "Ocultar anúncios" : "Ver anúncios"}
                                </button>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <MiniStat label="Gasto" value={brl(rAdset.gasto)} />
                                <MiniStat label="Impressões" value={String(rAdset.impressoes)} />
                                <MiniStat label="Cliques" value={String(rAdset.cliques)} />
                                <MiniStat label="Mensagens" value={String(rAdset.mensagens)} />
                              </div>

                              {isAdsetExpanded && (
                                <div className="space-y-3 border-t pt-4">
                                  {filhosAds.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado para este conjunto.</p>
                                  ) : (
                                    filhosAds.map((ad) => {
                                      const rAd = resumoAd(ad.id)
                                      return (
                                        <div key={ad.id} className="rounded-xl border bg-background p-4">
                                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                            <div className="space-y-2">
                                              <h4 className="font-medium">{ad.nome}</h4>
                                              <Badge>{statusLabel(ad.status)}</Badge>
                                            </div>
                                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 w-full md:w-auto md:min-w-[520px]">
                                              <MiniStat label="Gasto" value={brl(rAd.gasto)} />
                                              <MiniStat label="Impressões" value={String(rAd.impressoes)} />
                                              <MiniStat label="Cliques" value={String(rAd.cliques)} />
                                              <MiniStat label="Mensagens" value={String(rAd.mensagens)} />
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p>
          </div>
          <div className="rounded-xl border bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}
