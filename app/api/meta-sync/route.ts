// Rotina que puxa dados do Meta Ads e grava no Supabase.
// Roda no servidor (nunca expõe o token ao navegador).
// É chamada 1x/dia pela Vercel (Cron) e pode ser testada pela URL com ?secret=.
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Cliente Supabase do lado do servidor (RLS liberado nesta fase)
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Busca todas as páginas de um endpoint do Meta (segue paging.next)
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

// Extrai o "prefixo" do nome da campanha para ligar ao corretor.
// Ex.: "LEVI - Verão"  ->  "LEVI"
function prefixoCorretor(nome: string): string {
  return (nome.split(/[-–—|:]/)[0] || "").trim().toUpperCase()
}

export async function GET(req: Request) {
  // --- Segurança: só roda com o segredo certo ---
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  const qs = new URL(req.url).searchParams.get("secret")
  const autorizado = !!secret && (auth === `Bearer ${secret}` || qs === secret)
  if (!autorizado) return NextResponse.json({ erro: "não autorizado" }, { status: 401 })

  try {
    const token = process.env.META_ACCESS_TOKEN!
    const versao = process.env.META_API_VERSION || "v25.0"
    let conta = process.env.META_AD_ACCOUNT_ID! // ex.: act_123456
    if (!conta.startsWith("act_")) conta = `act_${conta}`
    const base = `https://graph.facebook.com/${versao}`

    // 1) Campanhas (nome + status atual)
    const campanhas = await metaGetAll(
      `${base}/${conta}/campaigns?fields=id,name,effective_status&limit=200&access_token=${token}`,
    )

    // 2) Gasto diário por campanha (últimos 30 dias)
    const insights = await metaGetAll(
      `${base}/${conta}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks&time_increment=1&date_preset=last_30d&limit=500&access_token=${token}`,
    )

    const supabase = db()

    // 3) Liga campanha -> corretor pelo prefixo do nome
    const { data: corretores } = await supabase
      .from("usuarios").select("id, nome").eq("role", "corretor")
    const mapaCorretor = new Map<string, string>()
    for (const c of corretores ?? []) {
      const primeiro = (c.nome || "").split(" ")[0].toUpperCase()
      if (primeiro) mapaCorretor.set(primeiro, c.id)
    }
    const achaCorretor = (nomeCampanha: string): string | null => {
      const p = prefixoCorretor(nomeCampanha)
      return mapaCorretor.get(p) ?? null
    }

    // 4) Grava campanhas
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

    // 5) Grava gastos diários (garante que a campanha existe antes)
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

    const linhasGasto = insights.map((r) => ({
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
      campanhas: linhasCamp.length,
      diasDeGasto: linhasGasto.length,
      quando: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e.message }, { status: 500 })
  }
}
