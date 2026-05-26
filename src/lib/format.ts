import { DESIGNATIONS, type Designation } from './types'

/** USD with $ symbol, no decimals. */
export function usd(n: number): string {
  return '$' + Math.round(n || 0).toLocaleString('en-US')
}

/** Original amount with its own currency symbol, for detail rows. */
export function money(n: number, currency: string): string {
  const v = Math.round(n || 0).toLocaleString('he-IL')
  const cur = (currency || '').trim()
  if (cur === '₪' || cur === 'שקל') return `₪${v}`
  if (cur === '€' || cur === 'יורו') return `€${v}`
  if (cur === '$' || cur === 'דולר') return `$${v}`
  return cur ? `${cur} ${v}` : v
}

export function pct(n: number): string {
  return `${Math.round(n || 0)}%`
}

export function formatDate(d: string): string {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}

export const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export const MONTHS_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

/** Stable color per designation, brand-aligned (burgundy/gold family + supporting hues). */
const DESIGNATION_COLORS: Record<Designation, string> = {
  'חברותא 2024': '#6c2d45',
  'חברותא 2025': '#9b4e6a',
  'חברותא 2026': '#c47a8a',
  'חברותא 2027': '#7e3452',
  'פולין': '#d4af37',
  'מירון': '#b8893b',
  'קרן הבנין': '#1f6f6b',
  'ידיד נאמן': '#3a6ea5',
  'עליות': '#8a6d3b',
  'שונות': '#9aa0a6',
}
export function designationColor(d: string): string {
  return DESIGNATION_COLORS[d as Designation] ?? '#9aa0a6'
}

/** Order designations canonically for consistent display. */
export function orderDesignations(keys: string[]): string[] {
  const idx = (k: string) => {
    const i = (DESIGNATIONS as readonly string[]).indexOf(k)
    return i === -1 ? 999 : i
  }
  return [...keys].sort((a, b) => idx(a) - idx(b))
}

/** YYYY-MM key from an ISO date string. */
export function ymKey(date: string): string | null {
  if (!date || date.length < 7) return null
  return date.slice(0, 7)
}
