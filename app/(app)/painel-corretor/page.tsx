"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Users2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useLeads } from "@/lib/leads-store"
import { LeadForm, type LeadFormValues } from "@/components/lead-form"
import { Button } from "@/components/ui/button"
import { Badge, Card, Dialog, Input, Select, Skeleton, Table, TD, TH, THead, TR, useToast } from "@/components/ui/primitives"
import { brl, fmtDate, LEAD_STATUSES, STATUS_LABEL, STATUS_VARIANT } from "@/lib/labels"

export default function PainelCorretorPage() {
  const { user } = useAuth()
  const { leads, addLead } = useLeads()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("todos")
  const [modal, setModal] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  const meus = useMemo(() => leads.filter((l) => l.corretorId === user!.id), [leads, user])
  const filtered = useMemo(
    () => meus.filter((l) => {
      const mq = `${l.nome} ${l.telefone}`.toLowerCase().includes(q.toLowerCase())
      const ms = status === "todos" || l.status === status
      return mq && ms
    }),
    [meus, q, status],
  )

  function handleCreate(v: LeadFormValues) {
    addLead(v)
    setModal(false)
    toast("Lead cadastrado com sucesso.")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">Meus Leads</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus leads e acompanhe as negociações.</p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" aria-label="Buscar leads" />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status" className="sm:w-48">
              <option value="todos">Todos os status</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </div>
          <Button onClick={() => setModal(true)}><Plus className="size-4" /> Novo Lead</Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasLeads={meus.length > 0} onNew={() => setModal(true)} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Nome</TH><TH>Telefone</TH><TH>Imóvel</TH><TH>Status</TH><TH>Valor</TH><TH>Criado</TH>
                  </TR>
                </THead>
                <tbody>
                  {filtered.map((l) => (
                    <TR key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/painel-corretor/${l.id}`)}>
                      <TD className="font-medium">{l.nome}</TD>
                      <TD className="text-muted-foreground">{l.telefone || "—"}</TD>
                      <TD className="text-muted-foreground">{l.imovelRef || "—"}</TD>
                      <TD><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></TD>
                      <TD>{brl(l.valorNegociacao)}</TD>
                      <TD className="text-muted-foreground">{fmtDate(l.criadoEm)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {filtered.map((l) => (
                <button key={l.id} onClick={() => router.push(`/painel-corretor/${l.id}`)} className="flex flex-col gap-2 rounded-lg border border-border p-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{l.nome}</span>
                    <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{l.telefone || "Sem telefone"}</span>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{l.imovelRef || "Sem imóvel"}</span>
                    <span>{brl(l.valorNegociacao)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} title="Novo Lead">
        <LeadForm defaultCorretorId={user!.id} onSubmit={handleCreate} onCancel={() => setModal(false)} />
      </Dialog>
    </div>
  )
}

function EmptyState({ hasLeads, onNew }: { hasLeads: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users2 className="size-6" /></div>
      <p className="text-sm text-muted-foreground">{hasLeads ? "Nenhum lead encontrado para o filtro selecionado." : "Nenhum lead cadastrado ainda"}</p>
      {!hasLeads && <Button onClick={onNew}><Plus className="size-4" /> Novo Lead</Button>}
    </div>
  )
}
