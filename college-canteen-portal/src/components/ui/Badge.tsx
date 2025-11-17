import React from 'react'
import clsx from 'clsx'

type BadgeProps = {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children?: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants: Record<string,string> = {
    default: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--text))] border border-[rgb(var(--border))]',
    success: 'bg-green-600/15 text-green-300 border border-green-700/50',
    warning: 'bg-amber-600/15 text-amber-300 border border-amber-700/50',
    danger: 'bg-rose-600/15 text-rose-300 border border-rose-700/50',
    info: 'bg-blue-600/15 text-blue-300 border border-blue-700/50'
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
