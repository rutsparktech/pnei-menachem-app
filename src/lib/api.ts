import type { DonorWithDetails } from './types'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  return 'http://localhost:3000'
}

export async function getAllDonors(): Promise<DonorWithDetails[]> {
  const res = await fetch(`${getBaseUrl()}/api/donors`, {
    next: { revalidate: 300, tags: ['donors'] },
  })
  if (!res.ok) throw new Error(`Failed to fetch donors: ${res.status}`)
  const data = await res.json()
  return data.donors
}

export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  const donors = await getAllDonors()
  return donors.find((d) => d.id === id) ?? null
}
