interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export default function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className={`rounded-[--radius-card] p-4 shadow-sm ${accent ? 'bg-primary text-white' : 'bg-surface border border-border'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-accent' : 'text-muted'}`}>{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-white' : 'text-text'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-muted'}`}>{sub}</p>}
    </div>
  )
}
