import { getDonorList, getDonorDetail } from './monday'
import type { Donor, DonorWithDetails } from './types'

export async function getAllDonors(): Promise<Donor[]> {
  return getDonorList()
}

export async function getDonorById(id: string): Promise<DonorWithDetails | null> {
  return getDonorDetail(id)
}
