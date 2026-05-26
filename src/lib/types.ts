// ============================================================================
// Pnei Menachem — Type definitions (rebuilt)
// All monetary "usd" fields are computed server-side from the original amount
// and the frozen exchange rate of each record (the Monday "סכום בדולר" formula
// column references a mirror and therefore returns null over the API).
// ============================================================================

/** The 10 canonical designations (ייעודים). Everything else is bucketed to "שונות". */
export const DESIGNATIONS = [
  'חברותא 2024',
  'חברותא 2025',
  'חברותא 2026',
  'חברותא 2027',
  'פולין',
  'מירון',
  'קרן הבנין',
  'ידיד נאמן',
  'עליות',
  'שונות',
] as const

export type Designation = (typeof DESIGNATIONS)[number]

/** Donor classification (סיווג תורם) — kept as-is from the dropdown column. */
export type Currency = '₪' | '$' | '€'

export interface Donation {
  id: string
  name: string
  donorId: string | null
  donorName: string
  /** original amount in the original currency */
  amount: number
  currency: string
  /** computed USD value using the record's frozen rate */
  usd: number
  /** effective date: value date, falling back to expected date */
  date: string
  designation: Designation
  paymentStatus: string
  /** סטטוס תרומה: עתידית / התקבלה / נדרשת בדיקה */
  donationStatus: string
  /** true when this donation lies in the future (projected income) */
  isFuture: boolean
  paymentMethod: string
  donationType: string
  /** linked commitment id, if any (קישור להתחייבויות) */
  commitmentId: string | null
  notes: string
  // ---- legacy fields (kept so not-yet-rebuilt screens keep compiling) ----
  donationDate: string
  donorLink: string
}

export interface Commitment {
  id: string
  name: string
  donorId: string | null
  donorName: string
  amount: number
  currency: string
  usd: number
  date: string
  designation: Designation
  status: string
  /** סוג התחייבות: הוראת קבע / חד פעמי */
  commitmentType: string
  isStandingOrder: boolean
  // ---- standing-order fields (read when present; safe when absent) ----
  monthlyAmount: number
  standingStartDate: string
  paymentsCount: number
  standingTotalUsd: number
  // ---- progress (computed server-side) ----
  /** total received against this commitment, in USD */
  paidUsd: number
  /** remaining to complete, in USD (never below 0) */
  remainingUsd: number
  /** 0–100 */
  pctPaid: number
  notes: string
  // ---- legacy fields ----
  commitmentDate: string
  donorLink: string
}

export interface Donor {
  id: string
  name: string
  hebrewName: string
  donorNumber: string
  classification: string
  city: string
  phone: string
  email: string
  currency: string
  photoUrl: string
  lastUpdated: string
  // ---- lifetime totals in USD (computed) ----
  totalDonations: number
  totalCommitments: number
  balance: number
  /** weighted % paid across all this donor's commitments */
  pctPaid: number
  // ---- legacy per-year fields (kept for not-yet-rebuilt screens) ----
  commitments2025: number
  donations2025: number
  balance2025: number
  commitments2026: number
  donations2026: number
  balance2026: number
}

export interface DonorWithDetails extends Donor {
  donations: Donation[]
  commitments: Commitment[]
}

/** Everything the app needs, enriched and cached together. */
export interface DataBundle {
  donors: DonorWithDetails[]
  donations: Donation[]
  commitments: Commitment[]
  lastSync: string
}

export interface NewDonationInput {
  donorId: string
  donorName: string
  amount: number
  currency: string
  date: string
  purpose: string
  paymentMethod: string
  notes: string
}
