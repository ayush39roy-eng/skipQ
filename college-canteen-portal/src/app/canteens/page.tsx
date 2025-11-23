import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import CanteensClient from './canteens-client'

export const dynamic = 'force-dynamic'

export default async function CanteensPage() {
  const session = await getSession()

  if (session?.role === 'VENDOR') {
    redirect('/vendor')
  }

  return <CanteensClient />
}
