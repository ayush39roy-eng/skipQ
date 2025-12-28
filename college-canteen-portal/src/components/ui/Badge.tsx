import React from 'react'
import clsx from 'clsx'

type BadgeProps = {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children?: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants: Record<string,string> = {
    default: 'bg-black text-white hover:bg-black/80',
    success: 'bg-[#06D6A0] text-black hover:bg-[#06D6A0]/80', // Mint Green (Neo-Brutalism)
    warning: 'bg-[#FF9F1C] text-black hover:bg-[#FF9F1C]/80', // Orange
    danger: 'bg-[#EF476F] text-white hover:bg-[#EF476F]/80', // Red
    info: 'bg-[#118AB2] text-white hover:bg-[#118AB2]/80' // Blue
  }
  
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-md border-2 border-black px-2.5 py-0.5 text-xs font-black uppercase transition-colors shadow-[2px_2px_0px_0px_#000]',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
