// app/api/meta-sync/route.ts
// Sincroniza Meta Ads em 3 níveis: campanha, conjunto e anúncio.
// Grava estrutura + insights diários no Supabase.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function metaGetAll(url: string): Promise<any[]> {
  const out: any[] = []
  let next: string | null = url
  let guard = 0

  while (next && guard < 20) {
    guard++
    const r = await fetch(next, { cache: "no-store" })
    const j = await r.json()
    if (j.error) throw new Error(`Meta: ${j.error.message}`)
    if (Array.isArray(j.data)) out.push(...j.data)
    next = j.paging?.next ?? null
  }

  return out
}

function num(v: any) {
  return Number(v ?? 0)
}

function getMensagensIniciadas(row: any) {
  const buckets = [
    ...(Array.isArray(row.actions) ? row.actions : []),
    ...(Array.isArray(row.conversions) ? row.conversions : []),
    ...(Array.isArray(row.cost_per_action_type) ? row.cost_per_action_type : []),
  ]

  const hit = buckets.find((x: any) =>
    [
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.messaging_conversation_started_1d",
      "onsite_conversion.total_messaging_connection",
      "onsite_conversion.messaging_first_reply",
      "messaging_conversation_started",
    ].includes(x.action_type),
  )

  return hit ? Number(hit.value ?? 0) : 0
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")
  const qs = new URL(req.url).searchParams.get("secret")
  const autorizado = !!secret && (auth === `Bearer ${secret}` || qs === secret)
  if (!autorizado) return NextResponse.json({ erro: "não autorizado" }, { status: 401 })

  try {
    const token = process.env.META_ACCESS_TOKEN!
    const versao = process.env.META_API_VERSION || "v25.0"
    let conta = process.env.META_AD_ACCOUNT_ID!
    if (!conta.startsWith("act_")) conta = `act_${conta}`
    const base = `https://graph.facebook.com/${versao}`
    const supabase = db()

    const [campanhas, adsets, ads] = await Promise.all([
      metaGetAll(`${base}/${conta}/campaigns?fields=id,name,effective_status&limit=200&access_token=${token}`),
      metaGetAll(`${base}/${conta}/adsets?fields=id,name,campaign_id,effective_status&limit=500&access_token=${token}`),
      metaGetAll(`${base}/${conta}/ads?fields=id,name,campaign_id,adset_id,effective_status&limit=1000&access_token=${token}`),
    ])

    const [insCampaign, insAdset, insAd] = await Promise.all([
      metaGetAll(`${base}/${conta}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks,actions&time_increment=1&date_preset=last_30d&limit=500&access_token=${token}`),
      metaGetAll(`${base}/${conta}/insights?level=adset&fields=campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,actions&time_increment=1&date_preset=last_30d&limit=1000&access_token=${token}`),
      metaGetAll(`${base}/${conta}/insights?level=ad&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions&time_increment=1&date_preset=last_30d&limit=2000&access_token=${token}`),
    ])

    const now = new Date().toISOString()

    const linhasCampanhas = campanhas.map((c) => ({
      id: c.id,
      nome: c.name ?? "",
      status: c.effective_status ?? null,
      conta,
      atualizado_em: now,
    }))

    const linhasAdsets = adsets.map((a) => ({
      id: a.id,
      campanha_id: a.campaign_id ?? null,
      nome: a.name ?? "",
      status: a.effective_status ?? null,
      atualizado_em: now,
    }))

    const linhasAds = ads.map((a) => ({
      id: a.id,
      campanha_id: a.campaign_id ?? null,
      adset_id: a.adset_id ?? null,
      nome: a.name ?? "",
      status: a.effective_status ?? null,
      atualizado_em: now,
    }))

    if (linhasCampanhas.length) {
      await supabase.from("meta_campanhas").upsert(linhasCampanhas, { onConflict: "id" })
    }

    if (linhasAdsets.length) {
      await supabase.from("meta_adsets").upsert(linhasAdsets, { onConflict: "id" })
    }

    if (linhasAds.length) {
      await supabase.from("meta_ads").upsert(linhasAds, { onConflict: "id" })
    }

    const campDaily = insCampaign.map((r) => ({
      campanha_id: r.campaign_id,
      data: r.date_start,
      gasto: num(r.spend),
      impressoes: num(r.impressions),
      cliques: num(r.clicks),
      mensagens_iniciadas: getMensagensIniciadas(r),
    }))

    const adsetDaily = insAdset
      .filter((r) => r.adset_id)
      .map((r) => ({
        adset_id: r.adset_id,
        campanha_id: r.campaign_id ?? null,
        data: r.date_start,
        gasto: num(r.spend),
        impressoes: num(r.impressions),
        cliques: num(r.clicks),
        mensagens_iniciadas: getMensagensIniciadas(r),
      }))

    const adDaily = insAd
      .filter((r) => r.ad_id)
      .map((r) => ({
        ad_id: r.ad_id,
        adset_id: r.adset_id ?? null,
        campanha_id: r.campaign_id ?? null,
        data: r.date_start,
        gasto: num(r.spend),
        impressoes: num(r.impressions),
        cliques: num(r.clicks),
        mensagens_iniciadas: getMensagensIniciadas(r),
      }))

    if (campDaily.length) {
      await supabase.from("meta_insights_campaign_daily").upsert(campDaily, { onConflict: "campanha_id,data" })
    }

    if (adsetDaily.length) {
      await supabase.from("meta_insights_adset_daily").upsert(adsetDaily, { onConflict: "adset_id,data" })
    }

    if (adDaily.length) {
      await supabase.from("meta_insights_ad_daily").upsert(adDaily, { onConflict: "ad_id,data" })
    }

    return NextResponse.json({
      ok: true,
      campanhas: linhasCampanhas.length,
      conjuntos: linhasAdsets.length,
      anuncios: linhasAds.length,
      insightsCampaign: campDaily.length,
      insightsAdset: adsetDaily.length,
      insightsAd: adDaily.length,
      quando: now,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e.message }, { status: 500 })
  }
}
