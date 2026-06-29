import { cache } from 'react'
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
    // reverse-link columns on the donor board → used for fast per-donor fetch
    donationsRel: 'board_relation_mm00ey5h',   // תרומות
    commitmentsRel: 'board_relation_mm00qhrb', // התחייבויות
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
      signal: AbortSignal.timeout(90000),
    })
  } catch (err) {
    console.warn(`[monday] fetch error (attempt ${attempt + 1}):`, (err as Error).message)
    if (attempt >= 3) throw err
    await delay(RETRY_DELAYS[attempt] + jitter())
    return mondayQuery(query, variables, attempt + 1)
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    console.warn(`[monday] 429 rate-limit (attempt ${attempt + 1})${retryAfter ? ', retry-after: ' + retryAfter + 's' : ''}`)
    if (attempt >= 3) throw new Error('Monday API rate limit exceeded after retries')
    await delay(RETRY_DELAYS[attempt] + jitter())
    return mondayQuery(query, variables, attempt + 1)
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`[monday] HTTP ${res.status}:`, errBody.slice(0, 400))
    throw new Error(`Monday API error: ${res.status}`)
  }
  const json = await res.json()
  if (json.errors) {
    console.error('[monday] GraphQL errors:', JSON.stringify(json.errors).slice(0, 400))
    throw new Error(json.errors[0]?.message ?? 'Monday API error')
  }
  return json.data
}

type RawCol = { id: string; text: string | null; value?: string | null; linked_items?: Array<{ id: string }> }
type RawItem = { id: string; name: string; updated_at?: string; column_values: RawCol[]; assets?: Array<{ public_url: string }> }

const COL_FRAGMENT = `id text value ... on BoardRelationValue { linked_items { id } }`

async function fetchAllItems(boardId: string, colIdList: string, extraItemFields = ''): Promise<RawItem[]> {
  const _t0 = Date.now()
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
  console.log(`[monday] board ${boardId} fetched ${items.length} items in ${Date.now() - _t0}ms`)
  return items
}

// Fetch items by their IDs, chunked at 100 (a donor can have 200+ linked records).
// Replaces the old relation-filter approach: Monday's query_params filter on a
// board_relation column matches the linked item's NAME, not its ID, so filtering
// by donor id failed. Reverse lookup (read linked ids off the donor item, then
// fetch by id) is reliable.
async function fetchItemsByIds(ids: string[], colIdList: string, extra = ''): Promise<RawItem[]> {
  const out: RawItem[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    if (!chunk.length) continue
    const data = await mondayQuery(`{ items(ids:[${chunk.join(',')}]) {
      id name ${extra} column_values(ids:[${colIdList}]) { ${COL_FRAGMENT} } } }`)
    out.push(...(data.items ?? []))
  }
  return out
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
// All linked ids in a board_relation column (relationId returns only the first).
function linkedIds(cv: RawCol[], id: string): string[] {
  const c = col(cv, id)
  if (c?.linked_items?.length) return c.linked_items.map((li) => li.id)
  if (c?.value) {
    try {
      const ids = JSON.parse(c.value)?.linkedPulseIds ?? []
      return ids.map((x: any) => String(x?.linkedPulseId ?? x))
    } catch { /* ignore */ }
  }
  return []
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
// Column lists
//
// DONATION_COLS_LEAN — tier-1 (home + donor list): 8 cols, excludes
//   commitmentRel and designation. Includes date for monthly/yearly aggregation.
//
// DONATION_COLS — tier-2 (donor detail): full set including display-only fields
//   (paymentMethod, donationType, notes) restored so donor detail table is complete.
// ----------------------------------------------------------------------------
const DONATION_COLS_LEAN = [
  C.donation.donorRel,
  C.donation.rateRel,
  C.donation.amount,
  C.donation.currency,
  C.donation.date,
  C.donation.expectedDate,
  C.donation.donationStatus,
  C.donation.paymentStatus,
].map((id) => `"${id}"`).join(', ')

const DONATION_COLS = [
  C.donation.donorRel, C.donation.commitmentRel, C.donation.rateRel,
  C.donation.amount, C.donation.currency, C.donation.date, C.donation.expectedDate,
  C.donation.designation, C.donation.donationStatus, C.donation.paymentStatus,
  C.donation.paymentMethod, C.donation.donationType, C.donation.notes,
].map((id) => `"${id}"`).join(', ')

const DONOR_COLS = [
  C.donor.hebrewName, C.donor.donorNumber, C.donor.city, C.donor.phone,
  C.donor.email, C.donor.classification, C.donor.currency, C.donor.lastUpdated,
  // photo omitted — photoUrl comes from item.assets instead
].map((id) => `"${id}"`).join(', ')

const COMMITMENT_COLS = [
  C.commitment.donorRel, C.commitment.rateRel, C.commitment.amount, C.commitment.currency,
  C.commitment.date, C.commitment.designation, C.commitment.status, C.commitment.type,
  C.commitment.paymentsCount,
  // notes omitted — display-only
  ...[C.commitment.monthlyAmount, C.commitment.standingStart, C.commitment.standingTotal].filter(Boolean),
].map((id) => `"${id}"`).join(', ')

const RATE_COLS = [C.rate.usd, C.rate.eur].map((id) => `"${id}"`).join(', ')

// ----------------------------------------------------------------------------
// Raw board fetches — plain async functions (not cached).
// Caching happens only at the small final-selector level (getHomeSummary,
// getDonorList, getDonorDetail — each < 300KB, always under Vercel's 2MB limit).
// React cache() on computeListBundle/computeBundle handles per-request dedup.
// ----------------------------------------------------------------------------
async function getRawDonors() {
  return fetchAllItems(DONOR_BOARD_ID, DONOR_COLS, 'updated_at assets { public_url }')
}
async function getRawDonations() {
  return fetchAllItems(DONATION_BOARD_ID, DONATION_COLS)
}
async function getRawDonationsLean() {
  return fetchAllItems(DONATION_BOARD_ID, DONATION_COLS_LEAN)
}
async function getRawCommitments() {
  return fetchAllItems(COMMITMENT_BOARD_ID, COMMITMENT_COLS)
}
async function getRawRates() {
  return fetchAllItems(RATES_BOARD_ID, RATE_COLS)
}

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

// ----------------------------------------------------------------------------
// Lean donation mapper — for tier-1 (home + donor list).
// Only the 8 columns in DONATION_COLS_LEAN are present; all others return ''.
// ----------------------------------------------------------------------------
type LeanDonation = {
  donorId: string | null
  usd: number
  date: string
  isFuture: boolean
  isReceived: boolean  // donationStatus === 'התקבלה' (strict)
  isCancelled: boolean // paymentStatus === 'בוטל'
}

function mapDonationLean(item: RawItem, rateMap: Map<string, Rate>): LeanDonation {
  const cv = item.column_values
  const amt = amount(cv, C.donation.amount)
  const currency = text(cv, C.donation.currency)
  const rate = rateMap.get(relationId(cv, C.donation.rateRel) ?? '')
  const date = text(cv, C.donation.date) || text(cv, C.donation.expectedDate)
  const donationStatus = text(cv, C.donation.donationStatus)
  const paymentStatus = text(cv, C.donation.paymentStatus)
  return {
    donorId: relationId(cv, C.donation.donorRel),
    usd: toUsd(amt, currency, rate),
    date,
    isFuture: donationStatus === 'עתידית' || (!!date && date > todayISO()),
    isReceived: donationStatus === 'התקבלה',
    isCancelled: paymentStatus === 'בוטל',
  }
}

const isReceived = (d: Donation) => d.donationStatus === 'התקבלה'
const isCancelled = (d: Donation) => d.paymentStatus === 'בוטל'

// ----------------------------------------------------------------------------
// ListBundle — internal type for computeListBundle result
// ----------------------------------------------------------------------------
type ListBundle = {
  donors: Donor[]
  months: Array<{ month: number; received: number; future: number; total: number; count: number }>
  yearReceived: number
  yearFuture: number
  totalCommitted: number
  totalPaid: number
  donorCount: number
  currentMonth: number
  year: number
}

// ----------------------------------------------------------------------------
// computeListBundle — lean tier-1 bundle (home page + donor list).
//
// Uses DONATION_COLS_LEAN (8 cols) instead of the full 13-col set, so the
// donation payload is smaller and faster. The cached result (Donor[] / summary
// object) is < 200KB — well under Vercel's 2MB Data Cache limit.
//
// React cache() deduplicates within a single request: when warmup calls both
// getHomeSummary and getDonorList, Monday is fetched only once per board.
// ----------------------------------------------------------------------------
const computeListBundle = cache(async (): Promise<ListBundle> => {
  const [donorItems, rateItems] = await Promise.all([getRawDonors(), getRawRates()])
  const donationItems = await getRawDonationsLean()
  const commitmentItems = await getRawCommitments()
  console.log('[monday] lean donations payload size:', JSON.stringify(donationItems).length)

  const rateMap = buildRateMap(rateItems)
  const donorNameById = new Map<string, string>()
  for (const it of donorItems) {
    donorNameById.set(it.id, text(it.column_values, C.donor.hebrewName) || it.name)
  }

  const leanDonations = donationItems.map(it => mapDonationLean(it, rateMap))
  const commitments = commitmentItems.map(it => mapCommitment(it, rateMap, donorNameById))

  // Per-donor donation aggregates
  const donorAgg = new Map<string, { total: number; d2025: number; d2026: number }>()

  for (const d of leanDonations) {
    if (!d.donorId || d.isCancelled) continue
    if (!donorAgg.has(d.donorId)) donorAgg.set(d.donorId, { total: 0, d2025: 0, d2026: 0 })
    const agg = donorAgg.get(d.donorId)!
    const donationYear = d.date ? new Date(d.date).getFullYear() : 0
    // totalDonations: strictly received (matches existing computeBundle behaviour)
    if (d.isReceived) agg.total += d.usd
    // year totals: all non-cancelled (matches existing donY behaviour)
    if (donationYear === 2025) agg.d2025 += d.usd
    if (donationYear === 2026) agg.d2026 += d.usd
  }

  // Per-donor commitment aggregates
  const commitmentsByDonor = new Map<string, Commitment[]>()
  for (const c of commitments) {
    if (!c.donorId) continue
    if (!commitmentsByDonor.has(c.donorId)) commitmentsByDonor.set(c.donorId, [])
    commitmentsByDonor.get(c.donorId)!.push(c)
  }

  // Build Donor objects (no nested arrays — same shape as getDonorList output)
  const donors: Donor[] = donorItems.map(it => {
    const base = mapDonor(it)
    const dt = donorAgg.get(base.id) ?? { total: 0, d2025: 0, d2026: 0 }
    const dCom = commitmentsByDonor.get(base.id) ?? []
    const totalDonations = dt.total
    const totalCommitments = dCom.reduce((s, c) => s + c.usd, 0)
    const c25 = dCom.filter(c => c.date && new Date(c.date).getFullYear() === 2025).reduce((s, c) => s + c.usd, 0)
    const c26 = dCom.filter(c => c.date && new Date(c.date).getFullYear() === 2026).reduce((s, c) => s + c.usd, 0)
    return {
      ...base,
      totalDonations,
      totalCommitments,
      balance: Math.max(0, totalCommitments - totalDonations),
      // pctPaid: approx using totalDonations (no commitmentRel in lean path — diff is minor)
      pctPaid: totalCommitments > 0 ? Math.min(100, Math.round((totalDonations / totalCommitments) * 100)) : 0,
      commitments2025: c25,
      donations2025: dt.d2025,
      balance2025: Math.max(0, c25 - dt.d2025),
      commitments2026: c26,
      donations2026: dt.d2026,
      balance2026: Math.max(0, c26 - dt.d2026),
    }
  })

  // Monthly breakdown for home summary
  const year = new Date().getFullYear()
  const months = Array.from({ length: 12 }, (_, m) => {
    const inMonth = leanDonations.filter(d => {
      if (!d.date || d.isCancelled) return false
      const dt = new Date(d.date)
      return dt.getFullYear() === year && dt.getMonth() === m
    })
    const received = inMonth.filter(d => !d.isFuture).reduce((s, d) => s + d.usd, 0)
    const future = inMonth.filter(d => d.isFuture).reduce((s, d) => s + d.usd, 0)
    return { month: m, received, future, total: received + future, count: inMonth.length }
  })

  const yearReceived = months.reduce((s, x) => s + x.received, 0)
  const yearFuture = months.reduce((s, x) => s + x.future, 0)
  const totalCommitted = commitments.reduce((s, c) => s + c.usd, 0)
  // totalPaid: sum of strictly received (approx — no commitmentRel to link to commitments)
  const totalPaid = leanDonations
    .filter(d => d.isReceived && !d.isCancelled)
    .reduce((s, d) => s + d.usd, 0)

  return {
    donors,
    months,
    yearReceived,
    yearFuture,
    totalCommitted,
    totalPaid,
    donorCount: donorItems.length,
    currentMonth: new Date().getMonth(),
    year,
  }
})

// ----------------------------------------------------------------------------
// computeBundle — full tier-2 bundle (individual donor detail page only).
// Fetches ALL 13 donation columns including paymentMethod/donationType/notes
// so the donor detail table shows complete data.
// React cache() deduplicates within a single request.
// ----------------------------------------------------------------------------
const computeBundle = cache(async (): Promise<DataBundle> => {
  // donors + rates in parallel (small, fast boards)
  const [donorItems, rateItems] = await Promise.all([getRawDonors(), getRawRates()])
  // donations then commitments sequentially — avoids Monday complexity spike on cold start
  const donationItems = await getRawDonations()
  const commitmentItems = await getRawCommitments()

  const rateMap = buildRateMap(rateItems)

  // donor display-name lookup
  const donorNameById = new Map<string, string>()
  for (const it of donorItems) {
    donorNameById.set(it.id, text(it.column_values, C.donor.hebrewName) || it.name)
  }

  console.log('[monday] full donations size:', JSON.stringify(donationItems).length)
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
})

// Public alias — keeps existing callers working

//הוספה של אבי ברונר
//המטרה להביא רק את התורם הספציפי ולא את כל התורמים
export const getDataBundle = computeBundle

/*
גרסא קודמת
async function computeDonorBundle(id: string): Promise<DonorWithDetails | null> {
  const [donorRes, rateItems, donationItems, commitmentItems] = await Promise.all([
    mondayQuery(`{ items(ids:[${id}]){ id name updated_at assets{public_url}
       column_values(ids:[${DONOR_COLS}]){ ${COL_FRAGMENT} } } }`),
    getRawRates(),                                                    // לוח קטן, זניח
    fetchItemsByRelation(DONATION_BOARD_ID,   C.donation.donorRel,   id, DONATION_COLS),
    fetchItemsByRelation(COMMITMENT_BOARD_ID, C.commitment.donorRel, id, COMMITMENT_COLS),
  ])
  const donorItem = donorRes.items?.[0]
  if (!donorItem) return null

  const rateMap = buildRateMap(rateItems)
  const nameById = new Map([[id, text(donorItem.column_values, C.donor.hebrewName) || donorItem.name]])
  const donations   = donationItems.map(it => mapDonation(it, rateMap, nameById))
  const commitments = commitmentItems.map(it => mapCommitment(it, rateMap, nameById))
  // ...אותו linking של paid/remaining/pct ואותה אגרגציה כמו ב-computeBundle,
  //    רק שעכשיו זה רץ על קומץ רשומות במקום על כל ה-DB
  return { ...mapDonor(donorItem), donations, commitments }
}
*/
//גרסא חדשה אבי ברונר — reverse lookup: קוראים את מזהי התרומות/התחייבויות מתוך פריט התורם
async function computeDonorBundle(id: string): Promise<DonorWithDetails | null> {
  // 1) פריט התורם + שתי עמודות הקישור שלו (תרומות / התחייבויות)
  const donorRes = await mondayQuery(`{ items(ids:[${id}]) {
    id name updated_at assets{public_url}
    column_values(ids:[${DONOR_COLS}, "${C.donor.donationsRel}", "${C.donor.commitmentsRel}"]) { ${COL_FRAGMENT} }
  } }`)
  const donorItem = donorRes.items?.[0]
  if (!donorItem) return null

  // 2) מזהי התרומות וההתחייבויות המקושרים לתורם
  const donationIds   = linkedIds(donorItem.column_values, C.donor.donationsRel)
  const commitmentIds = linkedIds(donorItem.column_values, C.donor.commitmentsRel)

  // 3) שליפה לפי ID (תמיד עובדת) + שערים
  const [rateItems, donationItems, commitmentItems] = await Promise.all([
    getRawRates(),
    fetchItemsByIds(donationIds,   DONATION_COLS),
    fetchItemsByIds(commitmentIds, COMMITMENT_COLS),
  ])

  console.log('[reconcile] donor', id,
    '| donationIds(read):', donationIds.length,
    '| donationItems(fetched):', donationItems.length,
    '| commitmentIds(read):', commitmentIds.length,
    '| commitmentItems(fetched):', commitmentItems.length)
  // אם fetched < read — האיבוד הוא בקפיצה השנייה (items(ids))

  const rateMap = buildRateMap(rateItems)
  const nameById = new Map([[id, text(donorItem.column_values, C.donor.hebrewName) || donorItem.name]])
  const donations   = donationItems.map(it => mapDonation(it, rateMap, nameById))
  const commitments = commitmentItems.map(it => mapCommitment(it, rateMap, nameById))

  // --- linking: paid / remaining / pct לכל התחייבות ---
  const byCommitment = new Map<string, Donation[]>()
  for (const d of donations) {
    if (!d.commitmentId) continue
    ;(byCommitment.get(d.commitmentId) ?? byCommitment.set(d.commitmentId, []).get(d.commitmentId)!).push(d)
  }
  for (const c of commitments) {
    const linked = byCommitment.get(c.id) ?? []
    const paid = linked.filter(d => isReceived(d) && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
    c.paidUsd = paid
    c.remainingUsd = Math.max(0, c.usd - paid)
    c.pctPaid = c.usd > 0 ? Math.min(100, Math.round((paid / c.usd) * 100)) : 0
  }

  // --- אגרגציה לתורם ---
  const totalDonations   = donations.filter(d => isReceived(d) && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
  const fwd = (await getDonorList()).find(d => d.id === id)
  console.log('[reconcile] donor', id,
    '| reverseTotalUsd:', totalDonations,
    '| forwardTotalUsd:', fwd?.totalDonations ?? 'N/A',
    '| delta:', (fwd?.totalDonations ?? 0) - totalDonations)

  const totalCommitments = commitments.reduce((s, c) => s + c.usd, 0)
  const paid             = commitments.reduce((s, c) => s + c.paidUsd, 0)
  const yr   = (date: string) => (date ? new Date(date).getFullYear() : 0)
  const donY = (y: number) => donations.filter(d => yr(d.date) === y && !isCancelled(d)).reduce((s, d) => s + d.usd, 0)
  const comY = (y: number) => commitments.filter(c => yr(c.date) === y).reduce((s, c) => s + c.usd, 0)
  const d25 = donY(2025), c25 = comY(2025), d26 = donY(2026), c26 = comY(2026)

  return {
    ...mapDonor(donorItem),
    totalDonations, totalCommitments,
    balance: Math.max(0, totalCommitments - totalDonations),
    pctPaid: totalCommitments > 0 ? Math.min(100, Math.round((paid / totalCommitments) * 100)) : 0,
    commitments2025: c25, donations2025: d25, balance2025: Math.max(0, c25 - d25),
    commitments2026: c26, donations2026: d26, balance2026: Math.max(0, c26 - d26),
    donations:   donations.sort((a, b) => (a.date < b.date ? 1 : -1)),
    commitments: commitments.sort((a, b) => (a.date < b.date ? 1 : -1)),
  }
}

export const getDonorDetail = unstable_cache(
  computeDonorBundle, ['pm-donor-detail-v2'], { revalidate: 7200, tags: ['monday-data'] }
)


// ----------------------------------------------------------------------------
// Cached selectors
// Tier-1 (home + donor list) → computeListBundle (lean, fast).
// Tier-2 (donor detail) → computeBundle (full, slower — only hit per-donor).
// Both result sets are small (<200KB) → always under Vercel's 2MB cache limit.
// ----------------------------------------------------------------------------
export const getHomeSummary = unstable_cache(async () => {
  const list = await computeListBundle()
  const result = {
    year: list.year,
    currentMonth: list.currentMonth,
    months: list.months,
    yearReceived: list.yearReceived,
    yearFuture: list.yearFuture,
    totalCommitted: list.totalCommitted,
    totalPaid: list.totalPaid,
    donorCount: list.donorCount,
  }
  console.log('[cache] getHomeSummary size:', JSON.stringify(result).length)
  return result
}, ['pm-home-summary'], { revalidate: 7200, tags: ['monday-data'] })

export const getDonorList = unstable_cache(async (): Promise<Donor[]> => {
  const list = await computeListBundle()
  // Sort descending by totalDonations — ranking computed once on server, sliced client-side
  const result = [...list.donors].sort((a, b) => b.totalDonations - a.totalDonations)
  console.log('[cache] getDonorList size:', JSON.stringify(result).length)
  return result
}, ['pm-donor-list'], { revalidate: 7200, tags: ['monday-data'] })

/*
גרסא ישנה
export const getDonorDetail = unstable_cache(async (id: string) => {
  const bundle = await computeDonorBundle(id)
  const result = bundle.donors.find((d) => d.id === id) ?? null
  console.log('[cache] getDonorDetail size:', JSON.stringify(result).length)
  return result
}, ['pm-donor-detail'], { revalidate: 7200, tags: ['monday-data'] })
*/

// getAllDonations / getAllCommitments — NOT cached (results too large for 2MB limit).
export async function getAllDonations(): Promise<Donation[]> {
  const bundle = await computeBundle()
  return bundle.donations
}

export async function getAllCommitments(): Promise<Commitment[]> {
  const bundle = await computeBundle()
  return bundle.commitments
}

// ----------------------------------------------------------------------------
// Backward-compatible exports (used by API routes + not-yet-rebuilt screens).
// ----------------------------------------------------------------------------
export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  return getDonorDetail(id)
}

export async function getDonorHeader(id: string): Promise<Donor | null> {
  const donors = await getDonorList()
  return donors.find((d) => d.id === id) ?? null
}

export async function fetchAllDonorsWithDetails(): Promise<DonorWithDetails[]> {
  const { donors } = await computeBundle()
  return donors
}

// Raw fetch aliases — kept for any callers that import them directly.
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
