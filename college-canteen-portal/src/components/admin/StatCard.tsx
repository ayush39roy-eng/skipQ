import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

type StatCardProps = {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    positive: boolean
    neutral?: boolean
  }
  alert?: boolean
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, subtitle, trend, alert, icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-white border rounded-xl p-6 transition-all duration-200",
      alert ? "border-rose-200 bg-rose-50/30" : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between text-xs">
          {subtitle && <p className="text-slate-500">{subtitle}</p>}
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 font-medium",
              trend.neutral ? "text-slate-500" :
              trend.positive ? "text-emerald-600" : "text-rose-600"
            )}>
              {trend.neutral ? <Minus className="h-3 w-3" /> :
               trend.positive ? <ArrowUpRight className="h-3 w-3" /> : 
               <ArrowDownRight className="h-3 w-3" />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
