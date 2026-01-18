import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/session'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // STRICT SECURITY CHECK
  // Data access alone isn't enough; we must protect the structure too.
  const session = await requireRole(['ADMIN'])
  
  if (!session) {
    redirect('/')
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  )
}
