import { unstable_cache } from 'next/cache'
import type {
  Donor, Donation, Commitment, DonorWithDetails, DataBundle,
  Designation, NewDonationInput,
} from './types'
import { DESIGNATIONS } from './types'

const MONDAY_API_URL = 'https://api.monday.com/v2'

const DONOR_BOARD_ID = process.env.MONDAY_DONORS_BOARD_ID ?? '5095730932'
const DONATION_BOARD_ID = process.env.MONDAY_DONATIONS_BOARD_ID ?? '5095730934'
const COMMITMENT_BOARD_ID = process.env.MONDAY_COMMITMENTS_BOARD_ID ?? '5095730933'
const RATES_BOARD_ID = process.env.MONDAY_RATES_BOARD_ID ?? '5095744305'

// Fallback rates, used only when a record has no frozen rate linked.
const FALLBACK_USD_RATE = 3.7   // ₪ per $
const FALLBACK_EUR_RATE = 4.0   // ₪ per €

// ----------------------------------------------------------------------------
// Column IDs (verified against the live boards)
// ----------------------------------------------------------------------------
const C = {
  donor: {
    hebrewName: 'text_mm08rf8z',
    donorNumber: 'text_mm008mkh',
    city: 'text_mm0bggf3',
    phone: 'phone_mkzyk0sm',
    email: 'email_mm00t0t3',
    classification: 'dropdown_mm2ctcs8',
    currency: 'color_mm00jmzh',
    photo: 'file_mkzyy76s',
    lastUpdated: 'pulse_updated_mm00a3ms',
  },
  donation: {
    donorRel: 'board_relation_mm00vj7d',
    commitmentRel: 'board_relation_mm00s26e',
    rateRel: 'board_relation_mm0vq8w8',
    amount: 'numeric_mm023gpx',
    currency: 'color_mm02k8mn',
    date: 'date_mm0250jx',
    expectedDate: 'date_mm027byt',
    designation: 'color_mm2m6j4a',
    donationStatus: 'color_mm2st8kb',
    paymentStatus: 'color_mkzyvjz5',
    paymentMethod: 'color_mm024cp9',
    donationType: 'color_mm024d5b',
    notes: 'text_mkzyftqz',
  },
  commitment: {
    donorRel: 'board_relation_mm00tdz2',
    rateRel: 'board_relation_mm0ved9f',
    amount: 'numeric_mm0nzwcj',
    currency: 'color_mm0ka46p',
    date: 'date_mkzyz4k8',
    designation: 'color_mm2mq3w2',
    status: 'color_mkzy1eme',
    type: 'color_mm2nkdzv',
    notes: 'text_mkzy8r2b',
    paymentsCount: 'numeric_mm2nd61g',
    // --- standing-order columns (fill IDs once created in Monday) ---
    monthlyAmount: process.env.MONDAY_SO_MONTHLY_COL ?? '',
    standingStart: process.env.MONDAY_SO_START_COL ?? 'date_mkzyj64s',
    standingTotal: process.env.MONDAY_SO_TOTAL_COL ?? '',
  },
  rate: {
    usd: 'numeric_mm06j15b',
    eur: 'numeric_mm0vh838',
  },
} as const

// ----------------------------------------------------------------------------
// Low-level query with retry/backoff
// ----------------------------------------------------------------------------
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const jitter = () => Math.random() * 2000
const RETRY_DELAYS = [5000, 15000, 30000]

async function mondayQuery(query: string, variables?: Record<string, unknown>, attempt = 0): Promise<any> {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) throw new Error('MONDAY_API_TOKEN not configured')

  let res: Response
  try {
    res = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2025-04' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
  } catch (err) {
    if (attempt >= 3) throw err
    await delay(RETRY_DELAYS[attempt] + jitter())
    return mondayQuery(query, variables, attempt + 1)
  }
  if (res.status === 429) {
    if (attempt >= 3) throw new Error('Monday API rate limit exceeded after retries')
    await delay(RETRY_DELAYS[attempt] + jitter())
    return mondayQuery(query, variables, attempt + 1)
  }
  if (!res.ok) throw new Error(`Monday API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Monday API error')
  return json.data
}

type RawCol = { id: string; text: string | null; value?: string | null; linked_items?: Array<{ id: string }> }
type RawItem = { id: string; name: string; updated_at?: string; column_values: RawCol[]; assets?: Array<{ public_url: string }> }

const COL_FRAGMENT = `id text value ... on BoardRelationValue { linked_items { id } }`

async function fetchAllItems(boardId: string, colIdList: string, extraItemFields = ''): Promise<RawItem[]> {
  const itemBlock = `
    id
    name
    ${extraItemFields}
    column_values(ids: [${colIdList}]) { ${COL_FRAGMENT} }`

  const initial = await mondayQuery(`{
    boards(ids: [${boardId}]) {
      items_page(limit: 200) { cursor items { ${itemBlock} } }
    }
  }`)
  const page = initial.boards[0]?.items_page ?? {}
  const items: RawItem[] = [...(page.items ?? [])]
  let cursor: string | null = page.cursor ?? null

  while (cursor) {
    const next = await mondayQuery(
      `query NextPage($cursor: String!, $limit: Int!) {
        next_items_page(limit: $limit, cursor: $cursor) { cursor items { ${itemBlock} } }
      }`,
      { cursor, limit: 200 }
    )
    const np = next.next_items_page ?? {}
    items.push(...(np.items ?? []))
    cursor = np.cursor ?? null
  }
  return items
}

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
function col(cv: RawCol[], id: string): RawCol | undefined {
  return cv.find((c) => c.id === id)
}
function text(cv: RawCol[], id: string): string {
  return col(cv, id)?.text ?? ''
}
function amount(cv: RawCol[], id: string): number {
  const c = col(cv, id)
  const n = parseFloat(String(c?.text ?? c?.value ?? '0').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
function relationId(cv: RawCol[], id: string): string | null {
  const c = col(cv, id)
  if (!c) return null
  if (c.linked_items && c.linked_items.length) return c.linked_items[0].id
  if (c.value) {
    try {
      const parsed = JSON.parse(c.value)
      const v = parsed?.linkedPulseIds?.[0]
      return v ? String(v) : null
    } catch { /* ignore */ }
  }
  return null
}

const CANON = new Set<string>(DESIGNATIONS)
const DESIGNATION_FIXES: Record<string, Designation> = {
  'חבורתא 2024': 'חברותא 2024',
  'חברותא שונות 2024': 'שונות',
  'קרם הבניין': 'קרן הבנין',
  'קרן הבניין': 'קרן הבנין',
  'קרם הבנין': 'קרן הבנין',
}
function normalizeDesignation(raw: string): Designation {
  const t = (raw || '').trim()
  if (CANON.has(t)) return t as Designation
  if (DESIGNATION_FIXES[t]) return DESIGNATION_FIXES[t]
  return 'שונות'
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ----------------------------------------------------------------------------
// Cached raw fetches
// ----------------------------------------------------------------------------
const DONOR_COLS = Object.values(C.donor).map((id) => `"${id}"`).join(', ')
const DONATION_COLS = Object.values(C.donation).map((id) => `"${id}"`).join(', ')
const COMMITMENT_COLS = Object.values(C.commitment).filter(Boolean).map((id) => `"${id}"`).join(', ')
const RATE_COLS = Object.values(C.rate).map((id) => `"${id}"`).join(', ')

const getRawDonors = unstable_cache(
  () => fetchAllItems(DONOR_BOARD_ID, DONOR_COLS, `updated_at assets { public_url }`),
  ['pm-donors'], { revalidate: 3600, tags: ['monday-data'] }
)
const getRawDonations = unstable_cache(
  () => fetchAllItems(DONATION_BOARD_ID, DONATION_COLS),
  ['pm-donations'], { revalidate: 3600, tags: ['monday-data'] }
)
const getRawCommitments = unstable_cache(
  () => fetchAllItems(COMMITMENT_BOARD_ID, COMMITMENT_COLS),
  ['pm-commitments'], { revalidate: 3600, tags: ['monday-data'] }
)
const getRawRates = unstable_cache(
  () => fetchAllItems(RATES_BOARD_ID, RATE_COLS),
  ['pm-rates'], { revalidate: 3600, tags: ['monday-data'] }
)

// ----------------------------------------------------------------------------
// USD conversion using each record's frozen rate
// ----------------------------------------------------------------------------
type Rate = { usd: number; eur: number }

function buildRateMap(rateItems: RawItem[]): Map<string, Rate> {
  const m = new Map<string, Rate>()
  for (const it of rateItems) {
    const usd = amount(it.column_values, C.rate.usd) || FALLBACK_USD_RATE
    const eur = amount(it.column_values, C.rate.eur) || FALLBACK_EUR_RATE
    m.set(it.id, { usd, eur })
  }
  return m
}

function toUsd(amt: number, currency: string, rate: Rate | undefined): number {
  const usdRate = rate?.usd || FALLBACK_USD_RATE
  const eurRate = rate?.eur || FALLBACK_EUR_RATE
  if (currency === '$') return Math.round(amt)
  if (currency === '₪') return Math.round(amt / usdRate)
  if (currency === '€') return Math.round((amt * eurRate) / usdRate)
  // default: treat unknown as USD to avoid zeroing data
  return Math.round(amt)
}

// ----------------------------------------------------------------------------
// Mappers
// ----------------------------------------------------------------------------
function mapDonation(item: RawItem, rateMap: Map<string, Rate>, donorNameById: Map<string, string>): Donation {
  const cv = item.column_values
  const amt = amount(cv, C.donation.amount)
  const currency = text(cv, C.donation.currency)
  const rate = rateMap.get(relationId(cv, C.donation.rateRel) ?? '')
  const date = text(cv, C.donation.date) || text(cv, C.donation.expectedDate)
  const donationStatus = text(cv, C.donation.donationStatus)
  const donorId = relationId(cv, C.donation.donorRel)
  const isFuture = donationStatus === 'עתידית' || (!!date && date > todayISO())
  return {
    id: item.id,
    name: item.name,
    donorId,
    donorName: (donorId && donorNameById.get(donorId)) || item.name,
    amount: amt,
    currency,
    usd: toUsd(amt, currency, rate),
    date,
    designation: normalizeDesignation(text(cv, C.donation.designation)),
    paymentStatus: text(cv, C.donation.paymentStatus),
    donationStatus,
    isFuture,
    paymentMethod: text(cv, C.donation.paymentMethod),
    donationType: text(cv, C.donation.donationType),
    commitmentId: relationId(cv, C.donation.commitmentRel),
    notes: text(cv, C.donation.notes),
    donationDate: date,
    donorLink: donorId ?? '',
  }
}

function mapCommitment(item: RawItem, rateMap: Map<string, Rate>, donorNameById: Map<string, string>): Commitment {
  const cv = item.column_values
  const amt = amount(cv, C.commitment.amount)
  const currency = text(cv, C.commitment.currency)
  const rate = rateMap.get(relationId(cv, C.commitment.rateRel) ?? '')
  const usd = toUsd(amt, currency, rate)
  const cType = text(cv, C.commitment.type)
  const donorId = relationId(cv, C.commitment.donorRel)
  const monthly = C.commitment.monthlyAmount ? amount(cv, C.commitment.monthlyAmount) : 0
  return {
    id: item.id,
    name: item.name,
    donorId,
    donorName: (donorId && donorNameById.get(donorId)) || item.name,
    amount: amt,
    currency,
    usd,
    date: text(cv, C.commitment.date),
    designation: normalizeDesignation(text(cv, C.commitment.designation)),
    status: text(cv, C.commitment.status),
    commitmentType: cType,
    isStandingOrder: cType.includes('הוראת קבע'),
    monthlyAmount: monthly,
    standingStartDate: C.commitment.standingStart ? text(cv, C.commitment.standingStart) : '',
    paymentsCount: amount(cv, C.commitment.paymentsCount),
    standingTotalUsd: C.commitment.standingTotal ? toUsd(amount(cv, C.commitment.standingTotal), currency, rate) : 0,
    paidUsd: 0,        // filled in linking pass
    remainingUsd: usd, // filled in linking pass
    pctPaid: 0,        // filled in linking pass
    notes: text(cv, C.commitment.notes),
    commitmentDate: text(cv, C.commitment.date),
    donorLink: donorId ?? '',
  }
}

function mapDonor(item: RawItem): Donor {
  const cv = item.column_values
  return {
    id: item.id,
    name: item.name,
    hebrewName: text(cv, C.donor.hebrewName),
    donorNumber: text(cv, C.donor.donorNumber),
    classification: text(cv, C.donor.classification),
    city: text(cv, C.donor.city),
    phone: text(cv, C.donor.phone),
    email: text(cv, C.donor.email),
    currency: text(cv, C.donor.currency),
    photoUrl: item.assets?.[0]?.public_url ?? '',
    lastUpdated: text(cv, C.donor.lastUpdated) || item.updated_at || '',
    totalDonations: 0,
    totalCommitments: 0,
    balance: 0,
    pctPaid: 0,
    commitments2025: 0, donations2025: 0, balance2025: 0,
    commitments2026: 0, donations2026: 0, balance2026: 0,
  }
}

const isReceived = (d: Donation) => d.donationStatus === 'התקבלה'
const isCancelled = (d: Donation) => d.paymentStatus === 'בוטל'

// ----------------------------------------------------------------------------
// Main: build the full enriched bundle (cached implicitly via raw caches)
// ----------------------------------------------------------------------------
async function computeBundle(): Promise<DataBundle> {
  const [donorItems, donationItems, commitmentItems, rateItems] = await Promise.all([
    getRawDonors(), getRawDonations(), getRawCommitments(), getRawRates(),
  ])

  const rateMap = buildRateMap(rateItems)

  // donor display-name lookup
  const donorNameById = new Map<string, string>()
  for (const it of donorItems) {
    donorNameById.set(it.id, text(it.column_values, C.donor.hebrewName) || it.name)
  }

  console.log('[monday] raw donations size:', JSON.stringify(donationItems).length)
  const donations = donationItems.map((it) => mapDonation(it, rateMap, donorNameById))
  const commitments = commitmentItems.map((it) => mapCommitment(it, rateMap, donorNameById))

  // ---- link donations to commitments → paid / remaining / pct ----
  const donationsByCommitment = new Map<string, Donation[]>()
  for (const d of donations) {
    if (!d.commitmentId) continue
    if (!donationsByCommitment.has(d.commitmentId)) donationsByCommitment.set(d.commitmentId, [])
    donationsByCommitment.get(d.commitmentId)!.push(d)
  }
  for (const c of commitments) {
    const linked = donationsByCommitment.get(c.id) ?? []
    const paid = linked.filter((d) => isReceived(d) && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
    c.paidUsd = paid
    c.remainingUsd = Math.max(0, c.usd - paid)
    c.pctPaid = c.usd > 0 ? Math.min(100, Math.round((paid / c.usd) * 100)) : 0
  }

  // ---- donor aggregation ----
  const donationsByDonor = new Map<string, Donation[]>()
  for (const d of donations) {
    if (!d.donorId) continue
    if (!donationsByDonor.has(d.donorId)) donationsByDonor.set(d.donorId, [])
    donationsByDonor.get(d.donorId)!.push(d)
  }
  const commitmentsByDonor = new Map<string, Commitment[]>()
  for (const c of commitments) {
    if (!c.donorId) continue
    if (!commitmentsByDonor.has(c.donorId)) commitmentsByDonor.set(c.donorId, [])
    commitmentsByDonor.get(c.donorId)!.push(c)
  }

  const donors: DonorWithDetails[] = donorItems.map((it) => {
    const base = mapDonor(it)
    const dDon = donationsByDonor.get(base.id) ?? []
    const dCom = commitmentsByDonor.get(base.id) ?? []
    const totalDonations = dDon.filter((d) => isReceived(d) && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
    const totalCommitments = dCom.reduce((s, c) => s + c.usd, 0)
    const paid = dCom.reduce((s, c) => s + c.paidUsd, 0)
    const yr = (date: string) => (date ? new Date(date).getFullYear() : 0)
    const donY = (y: number) => dDon.filter((d) => yr(d.date) === y && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
    const comY = (y: number) => dCom.filter((c) => yr(c.date) === y).reduce((s, c) => s + c.usd, 0)
    const d25 = donY(2025), c25 = comY(2025), d26 = donY(2026), c26 = comY(2026)
    return {
      ...base,
      totalDonations,
      totalCommitments,
      balance: Math.max(0, totalCommitments - totalDonations),
      pctPaid: totalCommitments > 0 ? Math.min(100, Math.round((paid / totalCommitments) * 100)) : 0,
      commitments2025: c25, donations2025: d25, balance2025: Math.max(0, c25 - d25),
      commitments2026: c26, donations2026: d26, balance2026: Math.max(0, c26 - d26),
      donations: dDon.sort((a, b) => (a.date < b.date ? 1 : -1)),
      commitments: dCom.sort((a, b) => (a.date < b.date ? 1 : -1)),
    }
  })

  return { donors, donations, commitments, lastSync: new Date().toISOString() }
}

// Public alias — keeps existing callers working
export const getDataBundle = computeBundle

// ----------------------------------------------------------------------------
// Cached selectors — each wraps computeBundle and returns only what it needs.
// The raw fetches (getRawDonors etc.) are already cached; these cache the
// mapping+aggregation layer on top of them.
// ----------------------------------------------------------------------------
export const getHomeSummary = unstable_cache(async () => {
  const bundle = await computeBundle()
  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const months = Array.from({ length: 12 }, (_, m) => {
    const inMonth = bundle.donations.filter((d) => {
      if (!d.date || d.paymentStatus === 'בטול') return false
      const dt = new Date(d.date)
      return dt.getFullYear() === year && dt.getMonth() === m
    })
    const received = inMonth.filter((d) => !d.isFuture).reduce((s, d) => s + d.usd, 0)
    const future = inMonth.filter((d) => d.isFuture).reduce((s, d) => s + d.usd, 0)
    return { month: m, received, future, total: received + future, count: inMonth.length }
  })
  const yearReceived = months.reduce((s, x) => s + x.received, 0)
  const yearFuture = months.reduce((s, x) => s + x.future, 0)
  const totalCommitted = bundle.commitments.reduce((s, c) => s + c.usd, 0)
  const totalPaid = bundle.commitments.reduce((s, c) => s + c.paidUsd, 0)
  return { year, currentMonth, months, yearReceived, yearFuture, totalCommitted, totalPaid, donorCount: bundle.donors.length }
}, ['pm-home-summary'], { revalidate: 3600, tags: ['monday-data'] })

export const getDonorList = unstable_cache(async (): Promise<Donor[]> => {
  const bundle = await computeBundle()
  // Strip nested arrays — this selector serves the donors list page which
  // only needs aggregated totals, not per-donor donations/commitments arrays.
  return bundle.donors.map(({ donations: _d, commitments: _c, ...rest }) => rest)
}, ['pm-donor-list'], { revalidate: 3600, tags: ['monday-data'] })

export const getDonorDetail = unstable_cache(async (id: string) => {
  const bundle = await computeBundle()
  return bundle.donors.find((d) => d.id === id) ?? null
}, ['pm-donor-detail'], { revalidate: 3600, tags: ['monday-data'] })

// ----------------------------------------------------------------------------
// Backward-compatible exports (used by API routes + not-yet-rebuilt screens).
// These keep the app building/working during the phased redesign.
// ----------------------------------------------------------------------------
export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  return getDonorDetail(id)
}

export async function fetchAllDonorsWithDetails(): Promise<DonorWithDetails[]> {
  const { donors } = await computeBundle()
  return donors
}
export const getCachedDonors = getRawDonors
export const getCachedDonations = getRawDonations
export const getCachedCommitments = getRawCommitments

// ----------------------------------------------------------------------------
// Create donation (write-back) — unchanged behaviour, verified column IDs
// ----------------------------------------------------------------------------
export async function createDonation(input: NewDonationInput): Promise<string> {
  const result = await mondayQuery(
    `mutation CreateDonation($boardId: ID!, $name: String!, $colVals: JSON!) {
      create_item(board_id: $boardId, item_name: $name, column_values: $colVals) { id }
    }`,
    {
      boardId: DONATION_BOARD_ID,
      name: `${input.donorName} - ${input.date}`,
      colVals: JSON.stringify({
        [C.donation.amount]: input.amount.toString(),
        [C.donation.currency]: { label: input.currency },
        [C.donation.date]: { date: input.date },
        [C.donation.designation]: { label: input.purpose },
        [C.donation.paymentMethod]: { label: input.paymentMethod },
        [C.donation.notes]: input.notes,
      }),
    }
  )
  return result.create_item.id
}
