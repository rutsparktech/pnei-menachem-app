type Status = 'paid' | 'pending' | 'cancelled' | string

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: 'שולם', className: 'bg-paid-bg text-paid' },
  pending: { label: 'ממתין', className: 'bg-pending-bg text-pending' },
  cancelled: { label: 'בוטל', className: 'bg-cancelled-bg text-cancelled' },
}

const classMap: Record<string, string> = {
  פלטינום: 'bg-[#e8e0f0] text-[#5b21b6]',
  זהב: 'bg-[#fef3c7] text-[#92400e]',
  כסף: 'bg-[#f1f5f9] text-[#475569]',
  רגיל: 'bg-[#f0fdf4] text-[#15803d]',
}

export function StatusBadge({ status }: { status: Status }) {
  const mapped = statusMap[status] ?? { label: status, className: 'bg-[#f1f5f9] text-[#475569]' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${mapped.className}`}>
      {mapped.label}
    </span>
  )
}

export function ClassificationBadge({ classification }: { classification: string }) {
  const cls = classMap[classification] ?? 'bg-[#f1f5f9] text-[#475569]'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {classification}
    </span>
  )
}
