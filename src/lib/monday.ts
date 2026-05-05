import { cacheLife, cacheTag } from 'next/cache'
import type { Donor, Donation, Commitment, DonorWithDetails, NewDonationInput } from './types'

const MONDAY_API_URL = 'https://api.monday.com/v2'

const DONOR_BOARD_ID = process.env.MONDAY_DONORS_BOARD_ID ?? '5095730932'
const DONATION_BOARD_ID = process.env.MONDAY_DONATIONS_BOARD_ID ?? '5095730934'
const COMMITMENT_BOARD_ID = process.env.MONDAY_COMMITMENTS_BOARD_ID ?? '5095730933'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function mondayQuery(query: string, attempt = 0): Promise<any> {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) throw new Error('MONDAY_API_TOKEN not configured')
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'API-Version': '2025-01',
    },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  })
  if (res.status === 429) {
    if (attempt >= 3) throw new Error('Monday API rate limit exceeded after retries')
    await delay(Math.pow(2, attempt) * 1000)
    return mondayQuery(query, attempt + 1)
  }
  if (!res.ok) throw new Error(`Monday API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Monday API error')
  return json.data
}

type RawCol = { id: string; text: string; value?: string; linked_items?: Array<{ id: string }> }
type RawItem = { id: string; name: string; column_values: RawCol[] }

function getColText(cv: RawCol[], id: string): string {
  return cv.find((c) => c.id === id)?.text ?? ''
}

function getDonorIdFromRelation(colValues: RawCol[], colId: string): string | null {
  const col = colValues.find((c) => c.id === colId)
  if (!col) return null
  if (col.linked_items && col.linked_items.length > 0) {
    return col.linked_items[0].id
  }
  if (col.value) {
    try {
      const parsed = JSON.parse(col.value)
      const id = parsed?.linkedPulseIds?.[0]
      return id ? String(id) : null
    } catch { /* ignore */ }
  }
  return null
}

function getAmount(cv: RawCol[], id: string): number {
  const col = cv.find((c) => c.id === id)
  const raw = col?.text ?? col?.value
  const n = parseFloat(String(raw || '0').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

const COL_FRAGMENT = `id text value ... on BoardRelationValue { linked_items { id } }`

async function fetchAllItems(boardId: string, colIdList: string): Promise<RawItem[]> {
  const initial = await mondayQuery(`{
    boards(ids: [${boardId}]) {
      items_page(limit: 200) {
        cursor
        items {
          id
          name
          column_values(ids: [${colIdList}]) { ${COL_FRAGMENT} }
        }
      }
    }
  }`)

  const page = initial.boards[0]?.items_page ?? {}
  const items: RawItem[] = [...(page.items ?? [])]
  let cursor: string | null = page.cursor ?? null

  while (cursor) {
    const next = await mondayQuery(`{
      next_items_page(limit: 200, cursor: "${cursor}") {
        cursor
        items {
          id
          name
          column_values(ids: [${colIdList}]) { ${COL_FRAGMENT} }
        }
      }
    }`)
    const np = next.next_items_page ?? {}
    items.push(...(np.items ?? []))
    cursor = np.cursor ?? null
  }

  return items
}

const DONOR_COLS = [
  'text_mm08rf8z', 'text_mm008mkh', 'text_mm0bggf3',
  'phone_mkzyk0sm', 'email_mm00t0t3', 'dropdown_mm2ctcs8', 'color_mm00jmzh',
].map((id) => `"${id}"`).join(', ')

const DONATION_COLS = [
  'board_relation_mm00vj7d', 'numeric_mm023gpx', 'color_mm02k8mn',
  'date_mm0250jx', 'color_mm2m6j4a', 'color_mkzyvjz5',
  'color_mm024cp9', 'color_mm024d5b', 'text_mkzyftqz',
].map((id) => `"${id}"`).join(', ')

const COMMITMENT_COLS = [
  'board_relation_mm00tdz2', 'numeric_mm0nzwcj', 'color_mm0ka46p',
  'date_mkzyz4k8', 'color_mm2mq3w2', 'color_mkzy1eme',
  'color_mm2nkdzv', 'text_mkzy8r2b',
].map((id) => `"${id}"`).join(', ')

function mapDonation(item: RawItem): Donation {
  const cv = item.column_values
  return {
    id: item.id,
    name: item.name,
    donationDate: getColText(cv, 'date_mm0250jx'),
    amount: getAmount(cv, 'numeric_mm023gpx'),
    currency: getColText(cv, 'color_mm02k8mn'),
    designation: getColText(cv, 'color_mm2m6j4a'),
    paymentStatus: getColText(cv, 'color_mkzyvjz5'),
    paymentMethod: getColText(cv, 'color_mm024cp9'),
    donationType: getColText(cv, 'color_mm024d5b'),
    notes: getColText(cv, 'text_mkzyftqz'),
    donorLink: cv.find((c) => c.id === 'board_relation_mm00vj7d')?.value ?? '',
  }
}

function mapCommitment(item: RawItem): Commitment {
  const cv = item.column_values
  return {
    id: item.id,
    name: item.name,
    commitmentDate: getColText(cv, 'date_mkzyz4k8'),
    amount: getAmount(cv, 'numeric_mm0nzwcj'),
    currency: getColText(cv, 'color_mm0ka46p'),
    designation: getColText(cv, 'color_mm2mq3w2'),
    status: getColText(cv, 'color_mkzy1eme'),
    commitmentType: getColText(cv, 'color_mm2nkdzv'),
    notes: getColText(cv, 'text_mkzy8r2b'),
    donorLink: cv.find((c) => c.id === 'board_relation_mm00tdz2')?.value ?? '',
  }
}

function buildDonorStats(donations: Donation[], commitments: Commitment[]) {
  const byYear = (items: Array<{ date: string; amount: number }>, y: number) =>
    items
      .filter((i) => i.date && new Date(i.date).getFullYear() === y)
      .reduce((s, i) => s + i.amount, 0)

  const dmap = donations.map((d) => ({ date: d.donationDate, amount: d.amount }))
  const cmap = commitments.map((c) => ({ date: c.commitmentDate, amount: c.amount }))

  const totalCommitments = commitments.reduce((s, c) => s + c.amount, 0)
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0)
  const commitments2025 = byYear(cmap, 2025)
  const donations2025 = byYear(dmap, 2025)
  const commitments2026 = byYear(cmap, 2026)
  const donations2026 = byYear(dmap, 2026)

  return {
    totalCommitments,
    totalDonations,
    balance: Math.max(0, totalCommitments - totalDonations),
    commitments2025,
    donations2025,
    balance2025: Math.max(0, commitments2025 - donations2025),
    commitments2026,
    donations2026,
    balance2026: Math.max(0, commitments2026 - donations2026),
  }
}

function mapDonorWithStats(item: RawItem, donations: Donation[], commitments: Commitment[]): Donor {
  const cv = item.column_values
  return {
    id: item.id,
    name: item.name,
    hebrewName: getColText(cv, 'text_mm08rf8z'),
    donorNumber: getColText(cv, 'text_mm008mkh'),
    city: getColText(cv, 'text_mm0bggf3'),
    phone: getColText(cv, 'phone_mkzyk0sm'),
    email: getColText(cv, 'email_mm00t0t3'),
    classification: getColText(cv, 'dropdown_mm2ctcs8'),
    currency: getColText(cv, 'color_mm00jmzh'),
    ...buildDonorStats(donations, commitments),
  }
}

export async function fetchAllDonorsWithDetails(): Promise<DonorWithDetails[]> {
  'use cache'
  cacheTag('monday-data')
  cacheLife({ revalidate: 300, stale: 300, expire: 3600 })

  const [donorItems, donationItems, commitmentItems] = await Promise.all([
    fetchAllItems(DONOR_BOARD_ID, DONOR_COLS),
    delay(300).then(() => fetchAllItems(DONATION_BOARD_ID, DONATION_COLS)),
    delay(600).then(() => fetchAllItems(COMMITMENT_BOARD_ID, COMMITMENT_COLS)),
  ])

  const rawDonationsByDonor = new Map<string, RawItem[]>()
  for (const item of donationItems) {
    const donorId = getDonorIdFromRelation(item.column_values, 'board_relation_mm00vj7d')
    if (donorId) {
      if (!rawDonationsByDonor.has(donorId)) rawDonationsByDonor.set(donorId, [])
      rawDonationsByDonor.get(donorId)!.push(item)
    }
  }

  const rawCommitmentsByDonor = new Map<string, RawItem[]>()
  for (const item of commitmentItems) {
    const donorId = getDonorIdFromRelation(item.column_values, 'board_relation_mm00tdz2')
    if (donorId) {
      if (!rawCommitmentsByDonor.has(donorId)) rawCommitmentsByDonor.set(donorId, [])
      rawCommitmentsByDonor.get(donorId)!.push(item)
    }
  }

  return donorItems.map((item) => {
    const donations = (rawDonationsByDonor.get(item.id) ?? []).map(mapDonation)
    const commitments = (rawCommitmentsByDonor.get(item.id) ?? []).map(mapCommitment)
    return {
      ...mapDonorWithStats(item, donations, commitments),
      donations,
      commitments,
    }
  })
}

export async function createDonation(input: NewDonationInput): Promise<string> {
  const columnValues = JSON.stringify({
    numeric_mm023gpx: input.amount.toString(),
    color_mm02k8mn: input.currency,
    date_mm0250jx: input.date,
    color_mm2m6j4a: input.purpose,
    color_mm024cp9: input.paymentMethod,
    text_mkzyftqz: input.notes,
  }).replace(/"/g, '\\"')

  const result = await mondayQuery(`mutation {
    create_item(
      board_id: ${DONATION_BOARD_ID},
      item_name: "${input.donorName} - ${input.date}",
      column_values: "${columnValues}"
    ) { id }
  }`)

  return result.create_item.id
}
