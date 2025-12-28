'use client'

import { VendorSidebar } from '@/components/vendor/VendorSidebar'
import { usePathname } from 'next/navigation'

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isTerminal = pathname === '/vendor/terminal'

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-vendor-text-primary font-sans antialiased selection:bg-vendor-accent selection:text-white">
      <VendorSidebar collapsed={isTerminal} />
      
      {/* 
         If Terminal: Small left margin (for icon rail) and no padding 
         If Normal: Large left margin (for full sidebar) and padding
      */}
      <div className={`transition-all duration-300 ${isTerminal ? 'ml-16' : 'ml-64 p-4'}`}>        <div className={`mx-auto ${isTerminal ? 'max-w-full' : 'max-w-7xl'}`}>
            {children}
        </div>
      </div>
    </div>
  )
}
