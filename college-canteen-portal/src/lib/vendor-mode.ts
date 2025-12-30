
import { prisma } from '@/lib/prisma'
import { VendorMode } from '@/types/vendor'

export { VendorMode }

export async function checkVendorMode(vendorId: string, requiredMode: VendorMode): Promise<boolean> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { mode: true }
  })

  if (!vendor) return false

  // FULL_POS has access to everything
  // ORDERS_ONLY has access only if requiredMode is ORDERS_ONLY
  
  if (vendor.mode === VendorMode.FULL_POS) return true
  
  if (vendor.mode === VendorMode.ORDERS_ONLY) {
      return requiredMode === VendorMode.ORDERS_ONLY
  }

  return false
}

export async function requireVendorMode(vendorId: string, requiredMode: VendorMode) {
    const allowed = await checkVendorMode(vendorId, requiredMode)
    if (!allowed) {
        throw new Error(`Permission Denied: This feature requires ${requiredMode} mode.`)
    }
}
