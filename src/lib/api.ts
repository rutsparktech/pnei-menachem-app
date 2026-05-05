import { fetchAllDonorsWithDetails } from './monday'
import type { DonorWithDetails } from './types'

export async function getAllDonors(): Promise<DonorWithDetails[]> {
  return fetchAllDonorsWithDetails()
}

export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  const donors = await fetchAllDonorsWithDetails()
  return donors.find((d) => d.id === id) ?? null
}
