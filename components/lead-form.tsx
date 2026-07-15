"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input, Label, Select, Textarea } from "@/components/ui/primitives"
import { LEAD_STATUSES, STATUS_LABEL } from "@/lib/labels"
import { CORRETORES, ORIGENS, PROPERTIES, type Lead, type LeadStatus } from "@/lib/mock-data"

export interface LeadFormValues {
  nome: string
  telefone: string
  email: string
  imovelRef: string
  origem: string
  observacoes: string
  status: LeadStatus
  valorNegociacao?: number
  corretorId: string
}

export function LeadForm({
  initial,
  defaultCorretorId,
  showCorretor = false,
  onSubmit,
  onCancel,
}: {
  initial?: Lead
  defaultCorretorId: string
  showCorretor?: boolean
  onSubmit: (v: LeadFormValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<LeadFormValues>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    imovelRef: initial?.imovelRef ?? "",
    origem: initial?.origem ?? ORIGENS[0],
    observacoes: initial?.observacoes ?? "",
    status: initial?.status ?? "novo",
    valorNegociacao: initial?.valorNegociacao,
    corretorId: initial?.corretorId ?? defaultCorretorId,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const showValor = v.status === "negociando" || v.status === "fechado"

  function set<K extends keyof LeadFormValues>(k: K, val: LeadFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!v.nome.trim()) errs.nome = "Informe o nome do lead."
    if (!v.telefone.trim()) errs.telefone = "Informe o telefone."
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) errs.email = "E-mail inválido."
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
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} aria-label="E-mail" />
          {err("email")}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="imovel">Referência do imóvel</Label>
          <Select id="imovel" value={v.imovelRef} onChange={(e) => set("imovelRef", e.target.value)} aria-label="Imóvel">
            <option value="">Selecione...</option>
            {PROPERTIES.map((p) => <option key={p.id} value={p.referencia}>{p.referencia} — {p.tipo}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="origem">Origem do lead</Label>
          <Select id="origem" value={v.origem} onChange={(e) => set("origem", e.target.value)} aria-label="Origem">
            {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={v.status} onChange={(e) => set("status", e.target.value as LeadStatus)} aria-label="Status">
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
        </div>
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
