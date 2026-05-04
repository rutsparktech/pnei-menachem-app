import type { Donor, Donation, Commitment, NewDonationInput } from './types'

const MONDAY_API_URL = 'https://api.monday.com/v2'

async function mondayQuery(query: string) {
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
  if (!res.ok) throw new Error(`Monday API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Monday API error')
  return json.data
}

// ─── Internal types ───────────────────────────────────────────────────────────
type RawCol = { id: string; text: string; value?: string; linked_items?: Array<{ id: string }> }
type RawItem = { id: string; name: string; column_values: RawCol[] }

// ─── Column helpers ───────────────────────────────────────────────────────────
function getColText(cv: RawCol[], id: string): string {
  return cv.find((c) => c.id === id)?.text ?? ''
}

// Board_relation columns need ... on BoardRelationValue { linked_items { id } }
// The value/text fields are null for board_relation in API-Version 2025-01.
function getDonorIdFromRelation(colValues: RawCol[], colId: string): string | null {
  const col = colValues.find((c) => c.id === colId)
  if (!col) return null
  // Primary: linked_items from the BoardRelationValue inline fragment
  if (col.linked_items && col.linked_items.length > 0) {
    return col.linked_items[0].id
  }
  // Fallback: value JSON {"linkedPulseIds":[123456]} (older API behaviour)
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

// For mock data where donorLink is already a serialised JSON string
function getDonorIdFromValue(value: string): string | null {
  try {
    const parsed = JSON.parse(value || 'null')
    const id = parsed?.linkedPulseIds?.[0]
    return id != null ? String(id) : null
  } catch {
    return null
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
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

// ─── Column ID lists ──────────────────────────────────────────────────────────
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

// ─── Mappers ──────────────────────────────────────────────────────────────────
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchDonors(): Promise<Donor[]> {
  const donorBoard = process.env.MONDAY_DONORS_BOARD_ID
  const donationBoard = process.env.MONDAY_DONATIONS_BOARD_ID
  const commitmentBoard = process.env.MONDAY_COMMITMENTS_BOARD_ID

  if (!donorBoard || !donationBoard || !commitmentBoard) {
    return MOCK_DONORS
  }

  const [donorItems, donationItems, commitmentItems] = await Promise.all([
    fetchAllItems(donorBoard, DONOR_COLS),
    fetchAllItems(donationBoard, DONATION_COLS),
    fetchAllItems(commitmentBoard, COMMITMENT_COLS),
  ])

  // Group raw donation items by donor ID before mapping
  const rawDonationsByDonor = new Map<string, RawItem[]>()
  for (const item of donationItems) {
    const donorId = getDonorIdFromRelation(item.column_values, 'board_relation_mm00vj7d')
    if (donorId) {
      if (!rawDonationsByDonor.has(donorId)) rawDonationsByDonor.set(donorId, [])
      rawDonationsByDonor.get(donorId)!.push(item)
    }
  }

  // Group raw commitment items by donor ID before mapping
  const rawCommitmentsByDonor = new Map<string, RawItem[]>()
  for (const item of commitmentItems) {
    const donorId = getDonorIdFromRelation(item.column_values, 'board_relation_mm00tdz2')
    if (donorId) {
      if (!rawCommitmentsByDonor.has(donorId)) rawCommitmentsByDonor.set(donorId, [])
      rawCommitmentsByDonor.get(donorId)!.push(item)
    }
  }

  const result = donorItems.map((item) =>
    mapDonorWithStats(
      item,
      (rawDonationsByDonor.get(item.id) ?? []).map(mapDonation),
      (rawCommitmentsByDonor.get(item.id) ?? []).map(mapCommitment),
    )
  )

  return result
}

export async function fetchDonorDetail(id: string): Promise<{
  donor: Donor
  donations: Donation[]
  commitments: Commitment[]
} | null> {
  const donorBoard = process.env.MONDAY_DONORS_BOARD_ID
  const donationBoard = process.env.MONDAY_DONATIONS_BOARD_ID
  const commitmentBoard = process.env.MONDAY_COMMITMENTS_BOARD_ID

  if (!donorBoard || !donationBoard || !commitmentBoard) {
    const donor = MOCK_DONORS.find((d) => d.id === id) ?? null
    if (!donor) return null
    return {
      donor,
      donations: MOCK_DONATIONS.filter((d) => getDonorIdFromValue(d.donorLink) === id),
      commitments: MOCK_COMMITMENTS.filter((c) => getDonorIdFromValue(c.donorLink) === id),
    }
  }

  const [donorData, donationItems, commitmentItems] = await Promise.all([
    mondayQuery(`{
      items(ids: [${id}]) {
        id
        name
        column_values(ids: [${DONOR_COLS}]) { ${COL_FRAGMENT} }
      }
    }`),
    fetchAllItems(donationBoard, DONATION_COLS),
    fetchAllItems(commitmentBoard, COMMITMENT_COLS),
  ])

  const rawDonor: RawItem | undefined = donorData.items?.[0]
  if (!rawDonor) return null

  // Filter at raw item level using getDonorIdFromRelation
  const donations = donationItems
    .filter((item) => getDonorIdFromRelation(item.column_values, 'board_relation_mm00vj7d') === id)
    .map(mapDonation)

  const commitments = commitmentItems
    .filter((item) => getDonorIdFromRelation(item.column_values, 'board_relation_mm00tdz2') === id)
    .map(mapCommitment)

  return {
    donor: mapDonorWithStats(rawDonor, donations, commitments),
    donations,
    commitments,
  }
}

export async function fetchDonations(donorId?: string): Promise<Donation[]> {
  const boardId = process.env.MONDAY_DONATIONS_BOARD_ID
  if (!boardId) {
    return donorId
      ? MOCK_DONATIONS.filter((d) => getDonorIdFromValue(d.donorLink) === donorId)
      : MOCK_DONATIONS
  }

  const items = await fetchAllItems(boardId, DONATION_COLS)
  const filtered = donorId
    ? items.filter((item) => getDonorIdFromRelation(item.column_values, 'board_relation_mm00vj7d') === donorId)
    : items
  return filtered.map(mapDonation)
}

export async function fetchCommitments(donorId?: string): Promise<Commitment[]> {
  const boardId = process.env.MONDAY_COMMITMENTS_BOARD_ID
  if (!boardId) {
    return donorId
      ? MOCK_COMMITMENTS.filter((c) => getDonorIdFromValue(c.donorLink) === donorId)
      : MOCK_COMMITMENTS
  }

  const items = await fetchAllItems(boardId, COMMITMENT_COLS)
  const filtered = donorId
    ? items.filter((item) => getDonorIdFromRelation(item.column_values, 'board_relation_mm00tdz2') === donorId)
    : items
  return filtered.map(mapCommitment)
}

export async function createDonation(input: NewDonationInput): Promise<string> {
  const boardId = process.env.MONDAY_DONATIONS_BOARD_ID
  if (!boardId) throw new Error('MONDAY_DONATIONS_BOARD_ID not configured')

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
      board_id: ${boardId},
      item_name: "${input.donorName} - ${input.date}",
      column_values: "${columnValues}"
    ) { id }
  }`)

  return result.create_item.id
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// linkedPulseIds[0] is a raw number (not an object)
const link = (id: string) => JSON.stringify({ linkedPulseIds: [parseInt(id)] })

export const MOCK_DONORS: Donor[] = [
  { id: '1', name: 'Moshe Cohen', hebrewName: 'משה כהן', donorNumber: 'D001', city: 'בני ברק', phone: '050-1234567', email: 'moshe@example.com', classification: 'זהב', currency: 'ILS', totalCommitments: 20000, totalDonations: 15000, balance: 5000, commitments2025: 10000, donations2025: 8000, balance2025: 2000, commitments2026: 10000, donations2026: 3000, balance2026: 7000 },
  { id: '2', name: 'Sarah Levi', hebrewName: 'שרה לוי', donorNumber: 'D002', city: 'ירושלים', phone: '052-2345678', email: 'sarah@example.com', classification: 'כסף', currency: 'USD', totalCommitments: 5000, totalDonations: 3800, balance: 1200, commitments2025: 2500, donations2025: 2000, balance2025: 500, commitments2026: 2500, donations2026: 700, balance2026: 1800 },
  { id: '3', name: 'Avraham Rosenberg', hebrewName: 'אברהם רוזנברג', donorNumber: 'D003', city: 'תל אביב', phone: '054-3456789', email: 'avraham@example.com', classification: 'פלטינום', currency: 'USD', totalCommitments: 50000, totalDonations: 38000, balance: 12000, commitments2025: 25000, donations2025: 20000, balance2025: 5000, commitments2026: 25000, donations2026: 7000, balance2026: 18000 },
  { id: '4', name: 'Rachel Greenberg', hebrewName: 'רחל גרינברג', donorNumber: 'D004', city: 'אשדוד', phone: '058-4567890', email: 'rachel@example.com', classification: 'רגיל', currency: 'ILS', totalCommitments: 1000, totalDonations: 700, balance: 300, commitments2025: 500, donations2025: 400, balance2025: 100, commitments2026: 500, donations2026: 200, balance2026: 300 },
  { id: '5', name: 'Yosef Shapira', hebrewName: 'יוסף שפירא', donorNumber: 'D005', city: 'חיפה', phone: '050-5678901', email: 'yosef@example.com', classification: 'זהב', currency: 'ILS', totalCommitments: 15000, totalDonations: 11500, balance: 3500, commitments2025: 7500, donations2025: 6000, balance2025: 1500, commitments2026: 7500, donations2026: 2000, balance2026: 5500 },
  { id: '6', name: 'Devora Friedman', hebrewName: 'דבורה פרידמן', donorNumber: 'D006', city: 'בית שמש', phone: '052-6789012', email: 'devora@example.com', classification: 'כסף', currency: 'ILS', totalCommitments: 4000, totalDonations: 3200, balance: 800, commitments2025: 2000, donations2025: 1800, balance2025: 200, commitments2026: 2000, donations2026: 600, balance2026: 1400 },
  { id: '7', name: 'Chaim Berkowitz', hebrewName: 'חיים ברקוביץ', donorNumber: 'D007', city: 'מודיעין עילית', phone: '054-7890123', email: 'chaim@example.com', classification: 'פלטינום', currency: 'USD', totalCommitments: 100000, totalDonations: 75000, balance: 25000, commitments2025: 50000, donations2025: 40000, balance2025: 10000, commitments2026: 50000, donations2026: 15000, balance2026: 35000 },
  { id: '8', name: 'Miriam Zilberman', hebrewName: 'מרים זילברמן', donorNumber: 'D008', city: 'רחובות', phone: '058-8901234', email: 'miriam@example.com', classification: 'רגיל', currency: 'ILS', totalCommitments: 0, totalDonations: 2000, balance: 0, commitments2025: 0, donations2025: 0, balance2025: 0, commitments2026: 0, donations2026: 0, balance2026: 0 },
]

export const MOCK_DONATIONS: Donation[] = [
  { id: 'd1', name: 'תרומה 1', donationDate: '2024-03-15', amount: 5000, currency: 'ILS', designation: 'קרן הבניין', paymentStatus: 'שולם', paymentMethod: 'העברה בנקאית', donationType: 'חד פעמי', notes: '', donorLink: link('1') },
  { id: 'd2', name: 'תרומה 2', donationDate: '2024-03-10', amount: 1000, currency: 'ILS', designation: 'קרן החינוך', paymentStatus: 'שולם', paymentMethod: "צ'ק", donationType: 'לזכר', notes: 'לזכר בעלה', donorLink: link('2') },
  { id: 'd3', name: 'תרומה 3', donationDate: '2024-03-05', amount: 10000, currency: 'USD', designation: 'עזרה דחופה', paymentStatus: 'ממתין', paymentMethod: 'העברה בנקאית', donationType: 'חד פעמי', notes: '', donorLink: link('3') },
  { id: 'd4', name: 'תרומה 4', donationDate: '2024-02-20', amount: 3000, currency: 'ILS', designation: 'קרן החינוך', paymentStatus: 'שולם', paymentMethod: 'מזומן', donationType: 'שנתי', notes: '', donorLink: link('1') },
  { id: 'd5', name: 'תרומה 5', donationDate: '2024-02-15', amount: 2000, currency: 'ILS', designation: 'קרן הבניין', paymentStatus: 'שולם', paymentMethod: 'אשראי', donationType: 'חד פעמי', notes: '', donorLink: link('5') },
  { id: 'd6', name: 'תרומה 6', donationDate: '2024-01-30', amount: 500, currency: 'ILS', designation: 'קרן החינוך', paymentStatus: 'בוטל', paymentMethod: 'מזומן', donationType: 'חד פעמי', notes: '', donorLink: link('4') },
  { id: 'd7', name: 'תרומה 7', donationDate: '2024-01-15', amount: 25000, currency: 'USD', designation: 'קרן הבניין', paymentStatus: 'שולם', paymentMethod: 'העברה בנקאית', donationType: 'שנתי', notes: 'תרומה שנתית', donorLink: link('7') },
  { id: 'd8', name: 'תרומה 8', donationDate: '2024-01-10', amount: 800, currency: 'ILS', designation: 'עזרה דחופה', paymentStatus: 'ממתין', paymentMethod: "צ'ק", donationType: 'חד פעמי', notes: '', donorLink: link('6') },
]

export const MOCK_COMMITMENTS: Commitment[] = [
  { id: 'c1', name: 'התחייבות 1', commitmentDate: '2025-06-01', amount: 10000, currency: 'ILS', designation: 'קרן הבניין', status: 'פעיל', commitmentType: 'שנתי', notes: '', donorLink: link('1') },
  { id: 'c2', name: 'התחייבות 2', commitmentDate: '2026-01-01', amount: 10000, currency: 'ILS', designation: 'קרן הבניין', status: 'עתידי', commitmentType: 'שנתי', notes: '', donorLink: link('1') },
  { id: 'c3', name: 'התחייבות 3', commitmentDate: '2025-07-01', amount: 5000, currency: 'USD', designation: 'קרן החינוך', status: 'פעיל', commitmentType: 'שנתי', notes: '', donorLink: link('2') },
  { id: 'c4', name: 'התחייבות 4', commitmentDate: '2025-05-01', amount: 50000, currency: 'USD', designation: 'עזרה דחופה', status: 'פעיל', commitmentType: 'מרובה שנים', notes: '', donorLink: link('3') },
  { id: 'c5', name: 'התחייבות 5', commitmentDate: '2025-04-01', amount: 100000, currency: 'USD', designation: 'קרן הבניין', status: 'פעיל', commitmentType: 'מרובה שנים', notes: 'תרומה ראשית', donorLink: link('7') },
]
