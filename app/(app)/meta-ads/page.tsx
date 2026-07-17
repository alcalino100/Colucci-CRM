"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Megaphone, CircleDollarSign, Activity, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useLeads } from "@/lib/leads-store"
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/primitives"
import { brl } from "@/lib/labels"

type Campanha = { id: string; nome: string; status: string | null; corretor_id: string | null }
type Gasto = { campanha_id: string; data: string; gasto: number; impressoes: number; cliques: number }

export default function MetaAdsPage() {
  const { userName } = useLeads()
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [c, g] = await Promise.all([
        supabase.from("meta_campanhas").select("id, nome, status, corretor_id"),
        supabase.from("meta_gastos_diarios").select("campanha_id, data, gasto, impressoes, cliques").order("data"),
      ])
      if (c.data) setCampanhas(c.data as Campanha[])
      if (g.data) setGastos(g.data as Gasto[])
      setLoading(false)
    })()
  }, [])

  const corretorDaCampanha = useMemo(() => {
    const m = new Map<string, string | null>()
    campanhas.forEach((c) => m.set(c.id, c.corretor_id))
    return m
  }, [campanhas])

  const kpis = useMemo(() => {
    const total = gastos.reduce((s, g) => s + Number(g.gasto), 0)
    const ativas = campanhas.filter((c) => (c.status ?? "").toUpperCase() === "ACTIVE").length
    const cliques = gastos.reduce((s, g) => s + Number(g.cliques), 0)
    return { total, ativas, cliques, nCamp: campanhas.length }
  }, [gastos, campanhas])

  const porDia = useMemo(() => {
    const m = new Map<string, number>()
    gastos.forEach((g) => m.set(g.data, (m.get(g.data) ?? 0) + Number(g.gasto)))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, gasto]) => ({ dia: data.slice(5), gasto: Number(gasto.toFixed(2)) }))
  }, [gastos])

  const porCorretor = useMemo(() => {
    const m = new Map<string, number>()
    gastos.forEach((g) => {
      const cid = corretorDaCampanha.get(g.campanha_id) ?? "sem"
      m.set(cid, (m.get(cid) ?? 0) + Number(g.gasto))
    })
    return [...m.entries()]
      .map(([cid, gasto]) => ({ nome: cid === "sem" ? "Sem corretor" : userName(cid), gasto }))
      .sort((a, b) => b.gasto - a.gasto)
  }, [gastos, corretorDaCampanha, userName])

  const gastoCampanha = useMemo(() => {
    const m = new Map<string, number>()
    gastos.forEach((g) => m.set(g.campanha_id, (m.get(g.campanha_id) ?? 0) + Number(g.gasto)))
    return m
  }, [gastos])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const vazio = campanhas.length === 0 && gastos.length === 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Meta Ads</h1>
        <p className="text-sm text-muted-foreground">Campanhas, gastos e desempenho por corretor.</p>
      </div>

      {vazio ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Ainda nÃ£o hÃ¡ dados. A sincronizaÃ§Ã£o com o Meta roda diariamente â€” ou dispare o teste manual da rotina.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={CircleDollarSign} label="Gasto (30 dias)" value={brl(kpis.total)} accent />
            <Kpi icon={Activity} label="Campanhas ativas" value={String(kpis.ativas)} />
            <Kpi icon={Megaphone} label="Total de campanhas" value={String(kpis.nCamp)} />
            <Kpi icon={Users} label="Cliques (30 dias)" value={String(kpis.cliques)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Gasto por dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#71717a" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#71717a" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => brl(Number(v))} />
                  <Bar dataKey="gasto" fill="#b22222" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Gasto por corretor</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {porCorretor.map((c) => (
                  <div key={c.nome} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="font-medium">{c.nome}</span>
                    <span className="font-display font-bold text-primary">{brl(c.gasto)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Campanhas</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {campanhas.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.corretor_id ? userName(c.corretor_id) : "Sem corretor"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={(c.status ?? "").toUpperCase() === "ACTIVE" ? "green" : "accent"}>
                        {(c.status ?? "â€”").toUpperCase() === "ACTIVE" ? "Ativa" : (c.status ?? "â€”")}
                      </Badge>
                      <span className="font-display font-bold text-primary">{brl(gastoCampanha.get(c.id) ?? 0)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className={`flex size-11 items-center justify-center rounded-lg ${accent ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
