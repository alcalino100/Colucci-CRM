"use client"

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { useLeads } from "@/lib/leads-store"
import { fmtDateTime } from "@/lib/labels"

export function NotificationBell() {
  const { notifications, markNotificationsRead } = useLeads()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) markNotificationsRead()
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label="Notificações" className="relative rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold">Notificações</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="border-b border-border/60 px-4 py-3 last:border-0">
                  <p className="text-sm leading-snug text-foreground">{n.texto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.timestamp)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
