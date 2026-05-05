import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST() {
  revalidatePath('/api/donors')
  revalidatePath('/')
  revalidatePath('/donor/[id]', 'page')
  revalidatePath('/reports/annual')
  revalidatePath('/reports/purpose')
  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() })
}
