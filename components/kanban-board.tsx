"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Dialog, Input, Label, Select, Textarea, useToast } from "@/components/ui/primitives"
import { LeadCard } from "@/components/lead-card"
import { LeadForm, type LeadFormValues } from "@/components/lead-form"
import { useLeads } from "@/lib/leads-store"
import { useAuth } from "@/lib/auth-context"
import { LEAD_STATUSES, STATUS_ACCENT, STATUS_LABEL, brl } from "@/lib/labels"
import { type Lead, type LeadStatus } from "@/lib/mock-data"

export function KanbanBoard({
  leads,
  showCorretor = false,
  currentCorretorId,
  isGestor = false,
  heightClass = "h-[calc(100vh-13rem)]",
}: {
  leads: Lead[]
  showCorretor?: boolean
  currentCorretorId: string
  isGestor?: boolean
  heightClass?: string
}) {
  const { updateLead, deleteLead, addVisit, addInteraction, notify, logChange, corretores, userName } = useLeads()
  const { user } = useAuth()
  const toast = useToast()
  const [visitLead, setVisitLead] = useState<Lead | null>(null)
  const [propLead, setPropLead] = useState<Lead | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [delLead, setDelLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const usuarioNome = user ? userName(user.id) : "Sistema"
  const canManage = (lead: Lead) => isGestor || lead.corretorId === currentCorretorId

  function handleEditSubmit(v: LeadFormValues) {
    if (!editLead) return
    setSubmitting(true)
    const fields: (keyof LeadFormValues)[] = ["nome", "telefone", "email", "imovelRef", "origem", "observacoes", "status", "valorNegociacao", "corretorId"]
    for (const f of fields) {
      const before = (editLead as any)[f]
      const after = (v as any)[f]
      if (String(before ?? "") !== String(after ?? "")) {
        logChange({ usuario: usuarioNome, acao: "edicao", entidade: "lead", campo: f, valorAnterior: String(before ?? "-"), valorNovo: String(after ?? "-") })
      }
    }
    setTimeout(() => {
      updateLead(editLead.id, v)
      setSubmitting(false)
      setEditLead(null)
      toast("Lead atualizado com sucesso")
    }, 500)
  }

  function handleDeleteConfirm() {
    if (!delLead) return
    logChange({ usuario: usuarioNome, acao: "exclusao", entidade: "lead", campo: "lead", valorAnterior: `${delLead.nome} — ${delLead.imovelRef || "sem imóvel"}`, valorNovo: "-" })
    deleteLead(delLead.id)
    setDelLead(null)
    toast("Lead excluído com sucesso")
  }

  // visit form
  const [vData, setVData] = useState("")
  const [vHora, setVHora] = useState("10:00")
  const [vCorretor, setVCorretor] = useState("")
  const [vObs, setVObs] = useState("")
  // proposal form
  const [pValor, setPValor] = useState("")
  const [pObs, setPObs] = useState("")

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const newStatus = destination.droppableId as LeadStatus
    const lead = leads.find((l) => l.id === draggableId)
    if (!lead) return
    updateLead(lead.id, { status: newStatus })

    if (newStatus === "visita agendada") {
      setVData(new Date().toISOString().slice(0, 10))
      setVHora("10:00")
      setVCorretor(lead.corretorId || currentCorretorId)
      setVObs("")
      setVisitLead(lead)
    } else if (newStatus === "negociando" || newStatus === "proposta enviada") {
      setPValor(lead.valorNegociacao ? String(lead.valorNegociacao) : "")
      setPObs("")
      setPropLead(lead)
    } else {
      toast(`${lead.nome} movido para "${STATUS_LABEL[newStatus]}"`)
    }
  }

  function confirmVisit(e: React.FormEvent) {
    e.preventDefault()
    if (!visitLead || !vData) return
    addVisit({ leadId: visitLead.id, data: vData, hora: vHora, corretorId: vCorretor, imovelRef: visitLead.imovelRef, observacoes: vObs })
    addInteraction(visitLead.id, { corretor: userName(vCorretor), texto: `Visita agendada para ${vData.split("-").reverse().join("/")} às ${vHora}.` })
    toast("Visita agendada e enviada para a agenda.")
    setVisitLead(null)
  }

  function confirmProposal(e: React.FormEvent) {
    e.preventDefault()
    if (!propLead) return
    const valor = Number(pValor)
    if (!valor || valor <= 0) {
      toast("Informe um valor válido.", "error")
      return
    }
    updateLead(propLead.id, { valorNegociacao: valor })
    if (pObs) addInteraction(propLead.id, { corretor: userName(propLead.corretorId), texto: pObs })
    notify(`Nova proposta: ${propLead.nome} — ${propLead.imovelRef || "imóvel"} — ${brl(valor)} por ${userName(propLead.corretorId)}`)
    toast("Proposta registrada. Todos foram notificados.")
    setPropLead(null)
  }

  const byStatus = (s: LeadStatus) => leads.filter((l) => l.status === s)

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-scroll w-full flex-1 overflow-x-auto overflow-y-hidden pb-3">
          <div className={`flex w-max flex-nowrap gap-4 ${heightClass}`}>
          {LEAD_STATUSES.map((status) => {
            const col = byStatus(status)
            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div className="flex w-72 flex-shrink-0 flex-col">
                    <div className="mb-2 flex shrink-0 items-center justify-between rounded-t-lg border-t-4 bg-card px-3 py-2 shadow-sm" style={{ borderTopColor: STATUS_ACCENT[status] }}>
                      <span className="font-display text-sm font-semibold">{STATUS_LABEL[status]}</span>
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{col.length}</span>
                    </div>
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? "bg-primary/10" : "bg-muted/40"}`}
                    >
                      {col.length === 0 && !snapshot.isDraggingOver && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum lead nesta etapa</p>
                      )}
                      {col.map((lead, i) => (
                        <Draggable draggableId={lead.id} index={i} key={lead.id}>
                          {(dp, ds) => (
                            <div
                              ref={dp.innerRef}
                              {...dp.draggableProps}
                              {...dp.dragHandleProps}
                              style={dp.draggableProps.style}
                              className={ds.isDragging ? "opacity-60" : ""}
                            >
                              <LeadCard lead={lead} showCorretor={showCorretor} canManage={canManage(lead)} onEdit={setEditLead} onDelete={setDelLead} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
          </div>
        </div>
      </DragDropContext>

      <Dialog open={!!visitLead} onClose={() => setVisitLead(null)} title="Agendar Visita">
        <form onSubmit={confirmVisit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Lead: <span className="font-medium text-foreground">{visitLead?.nome}</span> — {visitLead?.imovelRef || "sem imóvel"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="vd">Data *</Label>
              <Input id="vd" type="date" value={vData} onChange={(e) => setVData(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="vh">Horário *</Label>
              <Input id="vh" type="time" value={vHora} onChange={(e) => setVHora(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="vc">Corretor responsável</Label>
            <Select id="vc" value={vCorretor} onChange={(e) => setVCorretor(e.target.value)}>
              {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="vo">Observações</Label>
            <Textarea id="vo" value={vObs} onChange={(e) => setVObs(e.target.value)} />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setVisitLead(null)}>Cancelar</Button>
            <Button type="submit">Agendar visita</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!propLead} onClose={() => setPropLead(null)} title="Valor da Proposta">
        <form onSubmit={confirmProposal} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Lead: <span className="font-medium text-foreground">{propLead?.nome}</span> — {propLead?.imovelRef || "sem imóvel"}</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pv">Valor (R$) *</Label>
            <Input id="pv" type="number" value={pValor} onChange={(e) => setPValor(e.target.value)} placeholder="450000" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="po">Observações</Label>
            <Textarea id="po" value={pObs} onChange={(e) => setPObs(e.target.value)} />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPropLead(null)}>Cancelar</Button>
            <Button type="submit">Registrar proposta</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!editLead} onClose={() => setEditLead(null)} title="Editar Lead">
        {editLead && (
          <LeadForm
            initial={editLead}
            defaultCorretorId={editLead.corretorId}
            showCorretor={isGestor}
            showStatus
            submitting={submitting}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditLead(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!delLead} onClose={() => setDelLead(null)} title="Excluir Lead">
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
        </p>
        {delLead && (
          <p className="mt-2 text-sm font-medium text-foreground">{delLead.nome} — {delLead.imovelRef || "sem imóvel"}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDelLead(null)}>Cancelar</Button>
          <Button type="button" className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDeleteConfirm}>Excluir</Button>
        </div>
      </Dialog>
    </>
  )
}
