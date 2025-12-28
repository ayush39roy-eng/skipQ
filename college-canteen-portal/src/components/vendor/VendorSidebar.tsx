'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Modern, thinner icons for premium feel
const Icons = {
  dashboard: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  orders: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 20h4"/></svg>,
  pos: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"/></svg>,
  ledger: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 12V8H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12v4"></path><path d="M4 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H4z"></path></svg>,
  analytics: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  inventory: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  menu: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>,
  settings: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  reports: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
}

type IconName = keyof typeof Icons

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/vendor/terminal?view=POS', label: 'POS', icon: 'pos' },
  { href: '/vendor/terminal?view=ORDERS', label: 'Kitchen', icon: 'orders' },
  { href: '/vendor/menu', label: 'Menu', icon: 'menu' },
  { href: '/vendor/inventory', label: 'Inventory', icon: 'inventory' },
  { href: '/vendor/terminal?view=REPORTS', label: 'Reports', icon: 'reports' },
  { href: '/vendor/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/vendor/settings', label: 'Settings', icon: 'settings' },
]

function SidebarContent({ collapsed, pathname, searchView }: { collapsed: boolean, pathname: string, searchView: string | null }) {
  return (
    <div className={`flex h-full flex-col py-6 ${collapsed ? 'px-2' : 'px-4'}`}>
      {/* Brand Header */}
      <div className={`mb-10 flex items-center ${collapsed ? 'justify-center' : 'pl-2'}`}>
        {collapsed ? (
          <div className="h-10 w-10 flex items-center justify-center bg-vendor-accent rounded-lg text-white font-bold text-lg">
            S
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-vendor-accent rounded-lg text-white font-bold shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 10-4 4-4-4"></path></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">SkipQ</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Vendor OS</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Nav Items */}
      <ul className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          // Check if active based on Path + Query Param
          const isBasePathMatch = pathname === item.href.split('?')[0]
          const isQueryMatch = item.href.includes('?view=') 
            ? searchView === item.href.split('=')[1] 
            : true
          
          const isActive = isBasePathMatch && isQueryMatch


          const Icon = Icons[item.icon] || Icons.dashboard
          
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`group flex items-center rounded-lg px-3 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? 'bg-vendor-accent-soft text-vendor-accent font-medium'
                    : 'text-vendor-text-secondary hover:bg-white hover:text-vendor-text-primary'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`flex-shrink-0 w-5 h-5 transition-colors ${isActive ? 'text-vendor-accent' : 'text-vendor-text-secondary group-hover:text-vendor-text-primary'}`} />
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </Link>            </li>
          )
        })}
      </ul>
      
      {/* User Footer */}
      <div className="mt-auto pt-6 border-t border-[var(--vendor-border)]">
         {collapsed ? (
            <div className="flex justify-center group cursor-pointer">
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:border-emerald-300 transition-colors shadow-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
               </div>
            </div>
         ) : (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--vendor-surface)] transition-colors cursor-pointer group border border-transparent hover:border-[var(--vendor-border)]">
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-[var(--vendor-accent)] transition-colors shadow-sm">
                  <span className="font-bold">M</span>
               </div>
               <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-[var(--vendor-text-primary)] truncate transition-colors">Main Campus</p>
                  <div className="flex items-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <p className="text-xs text-[var(--vendor-text-secondary)] font-medium">Online</p>
                  </div>
               </div>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-slate-500"><path d="m9 18 6-6-6-6"/></svg>
            </div>
         )}
      </div>
    </div>
  )
}

export function VendorSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchView = searchParams.get('view')

  return (
    <>
      <aside 
        className={`fixed left-0 top-0 z-50 hidden h-screen border-r border-slate-200 bg-[#F1F4F8]/95 backdrop-blur-md text-slate-900 transition-all duration-300 sm:translate-x-0 md:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
         <Suspense fallback={<div className="p-4">Loading...</div>}>
            <SidebarContent collapsed={collapsed} pathname={pathname} searchView={searchView} />
         </Suspense>
      </aside>
    </>
  )
}
