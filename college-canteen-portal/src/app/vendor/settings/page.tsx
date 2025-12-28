import SettingsDashboard from '@/components/vendor/settings/SettingsDashboard'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function VendorSettingsPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    redirect('/auth/login?callbackUrl=/vendor/settings')
  }

  const vendorId = session.user.vendorId

  // Fetch Vendor & Canteen
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { 
        users: { take: 1, select: { email: true } }, 
        canteens: { take: 1 } 
    }
  })

  if (!vendor || vendor.canteens.length === 0) {
     return <div className="p-8 text-center text-slate-500">Error: Vendor or Canteen configuration not found. Please contact admin.</div>
  }

  const canteen = vendor.canteens[0]

  const dashboardData = {
    vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.users[0]?.email || 'N/A',
        phone: vendor.phone,
        whatsappEnabled: vendor.whatsappEnabled
    },
    canteen: {
        id: canteen.id,
        name: canteen.name,
        location: canteen.location,
        notificationPhones: canteen.notificationPhones,
        isOpen: canteen.manualIsOpen ?? false, // Using manual flag as primary for now
        autoMode: canteen.autoMode,
        weeklySchedule: canteen.weeklySchedule
    }
  }

  return <SettingsDashboard vendor={dashboardData.vendor} canteen={dashboardData.canteen} />
}
