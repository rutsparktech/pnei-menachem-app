export interface Donor {
  id: string
  name: string
  hebrewName: string
  donorNumber: string
  city: string
  phone: string
  email: string
  classification: string
  currency: string
  totalCommitments: number
  totalDonations: number
  balance: number
  commitments2025: number
  donations2025: number
  balance2025: number
  commitments2026: number
  donations2026: number
  balance2026: number
}

export interface Donation {
  id: string
  name: string
  donationDate: string
  amount: number
  currency: string
  designation: string
  paymentStatus: string
  paymentMethod: string
  donationType: string
  notes: string
  donorLink: string
}

export interface Commitment {
  id: string
  name: string
  commitmentDate: string
  amount: number
  currency: string
  designation: string
  status: string
  commitmentType: string
  notes: string
  donorLink: string
}

export interface DonorWithDetails extends Donor {
  donations: Donation[]
  commitments: Commitment[]
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
