import { Suspense } from 'react'
import NewDonationClient from './NewDonationClient'

export default function NewDonationPage() {
  return (
    <Suspense>
      <NewDonationClient />
    </Suspense>
  )
}
