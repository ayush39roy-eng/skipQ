import { HTMLAttributes, forwardRef } from 'react'

interface VendorCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'outline'
}

export const VendorCard = forwardRef<HTMLDivElement, VendorCardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = 'rounded-xl p-4 transition-all'
    
    const variants = {
      default: 'bg-[var(--vendor-surface)] border border-[var(--vendor-border)] shadow-sm hover:shadow-md',
      muted: 'bg-[var(--vendor-bg)] border border-[var(--vendor-border)]',
      outline: 'bg-transparent border border-[var(--vendor-border)] border-dashed'
    }

    const combinedClassName = `${baseStyles} ${variants[variant]} ${className || ''}`

    return (
      <div ref={ref} className={combinedClassName} {...props} />
    )
  }
)
VendorCard.displayName = 'VendorCard'
