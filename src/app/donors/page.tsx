import { getAllDonors } from '@/lib/api'
import DonorsList from '@/components/DonorsList'
import RefreshButton from '@/components/RefreshButton'

export const revalidate = 3600

export default async function Dashboard() {
  const donors = await getAllDonors()
  const lastUpdated = new Date().toISOString()

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-primary mb-1">שלום</h1>
        <p className="text-sm text-muted">ניהול תורמים · קרן פני מנחם</p>
      </div>
      <RefreshButton lastUpdated={lastUpdated} />
      <DonorsList donors={donors} />
    </div>
  )
}
