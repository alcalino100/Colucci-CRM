"use client"

import Link from "next/link"
import { Camera, Users, Megaphone, Circle, Phone, Clock, Building } from "lucide-react"
import { Badge } from "@/components/ui/primitives"
import { ORIGEM_VARIANT, brl, fmtDate } from "@/lib/labels"
import { userName, type Lead, type Origem } from "@/lib/mock-data"

const ORIGEM_ICON: Record<Origem, any> = {
  Instagram: Camera,
  Indicação: Users,
  "Tráfego Pago": Megaphone,
  Outro: Circle,
}

export function LeadCard({ lead, showCorretor = false }: { lead: Lead; showCorretor?: boolean }) {
  const OrigemIcon = ORIGEM_ICON[lead.origem]
  const initials = userName(lead.corretorId).split(" ").map((n) => n[0]).slice(0, 2).join("")
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/painel-corretor/${lead.id}`} className="font-display text-sm font-semibold leading-tight text-foreground hover:text-primary">
          {lead.nome}
        </Link>
        {showCorretor && (
          <span title={userName(lead.corretorId)} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
            {initials}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
        {lead.telefone && (
          <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{lead.telefone}</span>
        )}
        {lead.imovelRef && (
          <span className="flex items-center gap-1.5"><Building className="size-3.5" />{lead.imovelRef}</span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {lead.imovelRef && <Badge variant="gray">{lead.imovelRef}</Badge>}
        <Badge variant={ORIGEM_VARIANT[lead.origem]} className="gap-1">
          <OrigemIcon className="size-3" />
          {lead.origem}
        </Badge>
      </div>
      {lead.valorNegociacao != null && (
        <p className="mt-2 font-display text-sm font-bold text-primary">{brl(lead.valorNegociacao)}</p>
      )}
      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        Atualizado em {fmtDate(lead.atualizadoEm)}
      </div>
    </div>
  )
}
