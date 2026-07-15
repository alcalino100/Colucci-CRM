export function ColucciLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <polygon points="24,6 44,42 4,42" fill="#54595f" />
        <polygon points="24,16 35,36 13,36" fill="#c41e24" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <span className="block font-display text-base font-extrabold tracking-tight text-white">COLUCCI</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Imóveis</span>
        </div>
      )}
    </div>
  )
}
