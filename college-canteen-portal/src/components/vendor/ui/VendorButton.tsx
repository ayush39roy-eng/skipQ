import { ButtonHTMLAttributes, forwardRef } from 'react'

interface VendorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const VendorButton = forwardRef<HTMLButtonElement, VendorButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md'
    
    const variants = {
      primary: 'bg-[var(--vendor-accent)] text-[var(--vendor-bg)] hover:bg-[var(--vendor-text-primary)]',
      secondary: 'bg-[var(--vendor-surface)] border border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]',
      danger: 'bg-[var(--vendor-danger)] text-white hover:opacity-90',
      success: 'bg-[var(--vendor-success)] text-white hover:opacity-90',
      outline: 'border-2 border-[var(--vendor-accent)] text-[var(--vendor-accent)] hover:bg-[var(--vendor-accent)] hover:text-[var(--vendor-bg)]',
      ghost: 'text-[var(--vendor-text-secondary)] hover:bg-[var(--vendor-border)] hover:text-[var(--vendor-text-primary)]'
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
      xl: 'h-16 px-8 text-xl' // Great for POS touch targets
    }

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`

    return (
      <button type={type} ref={ref} className={combinedClassName} {...props} />
    )
  }
)

VendorButton.displayName = 'VendorButton'
