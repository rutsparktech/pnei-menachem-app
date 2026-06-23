import { getDonorList, getDonorDetail, fetchAllDonorsWithDetails } from './monday'
import type { Donor, DonorWithDetails } from './types'

// Returns Donor[] (no nested arrays) — for list views (donors page, KPI cards)
export async function getAllDonors(): Promise<Donor[]> {
  return getDonorList()
}

// Returns DonorWithDetails[] (with donations+commitments) — for report pages
export async function getAllDonorsWithDetails(): Promise<DonorWithDetails[]> {
  return fetchAllDonorsWithDetails()
}

export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  return getDonorDetail(id)
}
