"use client"

import { useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input, Label, Select, Textarea } from "@/components/ui/primitives"
import { LEAD_STATUSES, STATUS_LABEL } from "@/lib/labels"
import { CORRETORES, ORIGENS, type Lead, type LeadStatus, type Origem } from "@/lib/mock-data"

export interface LeadFormValues {
  nome: string
  telefone: string
  email: string
  imovelRef: string
  origem: Origem
  observacoes: string
  status: LeadStatus
  valorNegociacao?: number
  corretorId: string
}

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do lead."),
  telefone: z.string().trim().min(1, "Informe o telefone."),
  imovelRef: z
    .string()
    .trim()
    .min(2, "Informe a referência do imóvel (mín. 2 caracteres).")
    .regex(/^[A-Za-z0-9-]+$/, "Use apenas letras, números e hífen."),
  origem: z.enum(["Instagram", "Indicação", "Tráfego Pago", "Outro"]),
  email: z.string().email("E-mail inválido.").or(z.literal("")),
})

export function LeadForm({
  initial,
  defaultCorretorId,
  showCorretor = false,
  showStatus = true,
  onSubmit,
  onCancel,
}: {
  initial?: Lead
  defaultCorretorId: string
  showCorretor?: boolean
  showStatus?: boolean
  onSubmit: (v: LeadFormValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<LeadFormValues>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    imovelRef: initial?.imovelRef ?? "",
    origem: initial?.origem ?? "Instagram",
    observacoes: initial?.observacoes ?? "",
    status: initial?.status ?? "novo",
    valorNegociacao: initial?.valorNegociacao,
    corretorId: initial?.corretorId ?? defaultCorretorId,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const showValor = ["negociando", "proposta enviada", "fechado"].includes(v.status)

  function set<K extends keyof LeadFormValues>(k: K, val: LeadFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const result = schema.safeParse(v)
    const errs: Record<string, string> = {}
    if (!result.success) {
      for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message
    }
    if (showValor && (!v.valorNegociacao || v.valorNegociacao <= 0)) errs.valorNegociacao = "Informe o valor da negociação."
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({ ...v, valorNegociacao: showValor ? v.valorNegociacao : undefined })
  }

  const err = (k: string) => errors[k] && <span className="text-xs text-destructive">{errors[k]}</span>

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="nome">Nome *</Label>
          <Input id="nome" value={v.nome} onChange={(e) => set("nome", e.target.value)} aria-label="Nome do lead" />
          {err("nome")}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="tel">Telefone *</Label>
          <Input id="tel" value={v.telefone} onChange={(e) => set("telefone", e.target.value)} aria-label="Telefone" placeholder="(11) 90000-0000" />
          {err("telefone")}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="imovel">Referência do imóvel *</Label>
          <Input id="imovel" value={v.imovelRef} onChange={(e) => set("imovelRef", e.target.value)} aria-label="Referência do imóvel" placeholder="Ex: AP-1006" />
          {err("imovelRef")}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="origem">Origem do lead *</Label>
          <Select id="origem" value={v.origem} onChange={(e) => set("origem", e.target.value as Origem)} aria-label="Origem">
            {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} aria-label="E-mail" />
          {err("email")}
        </div>
        {showStatus && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={v.status} onChange={(e) => set("status", e.target.value as LeadStatus)} aria-label="Status">
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </div>
        )}
        {showCorretor && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="corretor">Corretor responsável</Label>
            <Select id="corretor" value={v.corretorId} onChange={(e) => set("corretorId", e.target.value)} aria-label="Corretor responsável">
              {CORRETORES.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
        )}
        {showValor && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="valor">Valor da negociação (R$) *</Label>
            <Input id="valor" type="number" value={v.valorNegociacao ?? ""} onChange={(e) => set("valorNegociacao", Number(e.target.value))} aria-label="Valor da negociação" />
            {err("valorNegociacao")}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" value={v.observacoes} onChange={(e) => set("observacoes", e.target.value)} aria-label="Observações" />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
