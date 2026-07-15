"use client"

import { useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, MessageSquarePlus, Phone, Mail, Home } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useLeads } from "@/lib/leads-store"
import { Button } from "@/components/ui/button"
import { Badge, Card, CardContent, CardHeader, CardTitle, Textarea, useToast } from "@/components/ui/primitives"
import { brl, fmtDateTime, STATUS_LABEL, STATUS_VARIANT } from "@/lib/labels"

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { getLead, addInteraction } = useLeads()
  const toast = useToast()
  const [nota, setNota] = useState("")
  const lead = getLead(id)

  if (!lead) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">Lead não encontrado.</p>
        <Link href="/painel-corretor"><Button variant="outline"><ArrowLeft className="size-4" /> Voltar</Button></Link>
      </div>
    )
  }

  function salvarNota() {
    if (!nota.trim()) return
    addInteraction(lead!.id, { corretor: user!.nome, texto: nota.trim() })
    setNota("")
    toast("Anotação registrada.")
  }

  const timeline = [...lead.interacoes].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/painel-corretor" className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Voltar"><ArrowLeft className="size-5" /></Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{lead.nome}</h1>
            <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Ficha de atendimento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Dados do lead</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Info icon={Phone} label="Telefone" value={lead.telefone || "—"} />
            <Info icon={Mail} label="E-mail" value={lead.email || "—"} />
            <Info icon={Home} label="Imóvel" value={lead.imovelRef || "—"} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Origem</span><span className="font-medium">{lead.origem}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor negociação</span><span className="font-medium">{brl(lead.valorNegociacao)}</span>
            </div>
            {lead.observacoes && <p className="rounded-lg bg-muted p-3 text-muted-foreground">{lead.observacoes}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Histórico de interações</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Adicionar nova anotação de atendimento..." aria-label="Nova anotação" />
              <div className="flex justify-end">
                <Button onClick={salvarNota} disabled={!nota.trim()}><MessageSquarePlus className="size-4" /> Adicionar anotação</Button>
              </div>
            </div>

            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
                {timeline.map((it) => (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[26px] top-1 flex size-3 items-center justify-center rounded-full bg-primary ring-4 ring-card" />
                    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
                      <p className="text-sm">{it.texto}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{it.corretor}</span>
                        <Clock className="size-3" />{fmtDateTime(it.timestamp)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  )
}
