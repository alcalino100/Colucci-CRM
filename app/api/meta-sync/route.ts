// app/api/meta-sync/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function metaGetAll(url: string): Promise<any[]> {
  const out: any[] = []
  let next: string | null = url
  let guard = 0
  while (next && guard < 20) {
    guard++
    const r = await fetch(next)
    const j = await r.json()
    if (j.error) throw new Error(`Meta: ${j.error.message}`)
    if (Array.isArray(j.data)) out.push(...j.data)
    next = j.paging?.next ?? null
  }
  return out
}

function prefixoCorretor(nome: string): string {
  return (nome.split(/[-–—|:]/)[0] || "").trim().toUpperCase()
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const auth = req.headers.get("authorization")
  const qs = url.searchParams.get("secret")
  const autorizado = !!secret && (auth === `Bearer ${secret}` || qs === secret)
  if (!autorizado) return NextResponse.json({ erro: "não autorizado" }, { status: 401 })

  try {
    const token = process.env.META_ACCESS_TOKEN!
    const versao = process.env.META_API_VERSION || "v25.0"

    // conta agora vem da querystring, com fallback para a variável de ambiente
    let conta = url.searchParams.get("account_id") || process.env.META_AD_ACCOUNT_ID!
    if (!conta.startsWith("act_")) conta = `act_${conta}`

    const since = url.searchParams.get("since")
    const until = url.searchParams.get("until")
    const datePart = since && until
      ? `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      : `date_preset=last_30d`

    const base = `https://graph.facebook.com/${versao}`

    const campanhas = await metaGetAll(
      `${base}/${conta}/campaigns?fields=id,name,effective_status&limit=200&access_token=${token}`
    )

    const insights = await metaGetAll(
      `${base}/${conta}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks&time_increment=1&${datePart}&limit=500&access_token=${token}`
    )

    const supabase = db()

    const { data: corretores } = await supabase.from("usuarios").select("id, nome").eq("role", "corretor")
    const mapaCorretor = new Map<string, string>()
    for (const c of corretores ?? []) {
      const primeiro = (c.nome || "").split(" ")[0].toUpperCase()
      if (primeiro) mapaCorretor.set(primeiro, c.id)
    }
    const achaCorretor = (nomeCampanha: string): string | null => {
      const p = prefixoCorretor(nomeCampanha)
      return mapaCorretor.get(p) ?? null
    }

    const linhasCamp = campanhas.map((c) => ({
      id: c.id,
      nome: c.name ?? "",
      status: c.effective_status ?? null,
      conta,
      corretor_id: achaCorretor(c.name ?? ""),
      atualizado_em: new Date().toISOString(),
    }))
    if (linhasCamp.length)
      await supabase.from("meta_campanhas").upsert(linhasCamp, { onConflict: "id" })

    const idsConhecidos = new Set(linhasCamp.map((c) => c.id))
    const faltantes = new Map<string, string>()
    for (const r of insights) {
      if (!idsConhecidos.has(r.campaign_id) && !faltantes.has(r.campaign_id))
        faltantes.set(r.campaign_id, r.campaign_name ?? "")
    }
    if (faltantes.size) {
      const extra = [...faltantes.entries()].map(([id, nome]) => ({
        id, nome, status: null, conta, corretor_id: achaCorretor(nome),
        atualizado_em: new Date().toISOString(),
      }))
      await supabase.from("meta_campanhas").upsert(extra, { onConflict: "id" })
    }

    const linhasGasto = insights.map((r: any) => ({
      campanha_id: r.campaign_id,
      data: r.date_start,
      gasto: Number(r.spend ?? 0),
      impressoes: Number(r.impressions ?? 0),
      cliques: Number(r.clicks ?? 0),
    }))
    if (linhasGasto.length)
      await supabase.from("meta_gastos_diarios").upsert(linhasGasto, { onConflict: "campanha_id,data" })

    return NextResponse.json({
      ok: true,
      conta,
      campanhas: linhasCamp.length,
      diasDeGasto: linhasGasto.length,
      quando: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e.message }, { status: 500 })
  }
}
