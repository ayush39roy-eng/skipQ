import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  BookOpen, 
  Banknote, 
  FileText, 
  Flag, 
  Settings, 
  ClipboardList, 
  Activity,
  LogOut,
  ArrowLeft
} from 'lucide-react'
import { cn } from "@/lib/utils"

const navSections = [
  {
    title: 'Main',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/vendors', label: 'Vendors', icon: Store },
      { href: '/admin/orders', label: 'Orders', icon: Package },
      { href: '/admin/ledger', label: 'Ledger', icon: BookOpen },
    ]
  },
  {
    title: 'Financial',
    items: [
      { href: '/admin/settlements', label: 'Settlements', icon: Banknote },
      { href: '/admin/reports', label: 'Reports', icon: FileText },
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/admin/flags', label: 'Feature Flags', icon: Flag },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/logs', label: 'Audit Logs', icon: ClipboardList },
      { href: '/admin/health', label: 'Health', icon: Activity },
    ]
  }
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 overflow-y-auto flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <Link href="/canteens" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Canteens</span>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
        <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Control Plane</p>
      </div>

      <div className="flex-1 py-6 px-4 space-y-8">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "text-slate-300" : "text-gray-400")} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={() => window.location.href = '/api/auth/logout'}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  )
}
