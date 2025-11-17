import React from 'react'
import clsx from 'clsx'

type StepperProps = {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  className?: string
}

export function Stepper({ value, min = 0, max = Number.MAX_SAFE_INTEGER, onChange, className }: StepperProps) {
  const dec = () => onChange(Math.max(value - 1, min))
  const inc = () => onChange(Math.min(value + 1, max))
  return (
    <div className={clsx('inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]', className)}>
      <button type="button" aria-label="Decrease" className="px-2 py-1 text-sm hover:bg-[rgb(var(--surface))]" onClick={dec}>−</button>
      <div className="px-3 py-1 text-sm font-semibold tabular-nums" aria-live="polite">{value}</div>
      <button type="button" aria-label="Increase" className="px-2 py-1 text-sm hover:bg-[rgb(var(--surface))]" onClick={inc}>＋</button>
    </div>
  )
}
