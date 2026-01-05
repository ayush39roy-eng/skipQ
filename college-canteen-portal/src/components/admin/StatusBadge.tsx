import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status: string
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'default'
  className?: string
}

const variants = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
  default: "bg-gray-50 text-gray-600 border-gray-200"
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  // Auto-detect variant if not explicit
  const resolvedVariant = variant || detectVariant(status)

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variants[resolvedVariant] || variants.default,
      className
    )}>
      {status}
    </span>
  )
}

function detectVariant(status: string): keyof typeof variants {
  const lower = status?.toLowerCase() || ''
  
  if (lower.includes('success') || lower.includes('active') || lower.includes('completed') || lower.includes('settled') || lower.includes('exported') || lower.includes('paid') || lower.includes('operational') || lower.includes('pass')) {
    return 'success'
  }
  if (lower.includes('pending') || lower.includes('created') || lower.includes('processing')) {
    return 'warning'
  }
  if (lower.includes('failed') || lower.includes('error') || lower.includes('suspended') || lower.includes('refunded') || lower.includes('cancelled') || lower.includes('down') || lower.includes('fail') || lower.includes('critical')) {
    return 'error'
  }
  if (lower.includes('unsettled')) {
    return 'info'
  }
  
  return 'neutral'
}
