import React from 'react'
import clsx from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes: Record<string,string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  const variants: Record<string,string> = {
    primary: 'bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-hover))] shadow-sm focus-visible:ring-[rgb(var(--ring))] active:scale-[0.98]',
    secondary: 'bg-white text-[rgb(var(--text))] border border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))] shadow-sm focus-visible:ring-[rgb(var(--ring))]',
    ghost: 'text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-muted))] focus-visible:ring-[rgb(var(--ring))]',
    outline: 'bg-transparent text-[rgb(var(--text))] border border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))] focus-visible:ring-[rgb(var(--ring))]',
    danger: 'bg-[rgb(var(--vendor-danger))] text-white hover:opacity-90 shadow-sm focus-visible:ring-[rgb(var(--ring))]'  }
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />}
      {children}
    </button>
  )
}
