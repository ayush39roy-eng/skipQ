import React from 'react'
import clsx from 'clsx'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
}

export function Input({ label, hint, className, inputClassName, ...rest }: InputProps & { inputClassName?: string }) {
  return (
    <label className={clsx('block space-y-1', className)}>
      {label && <span className="block text-sm font-medium" style={{ color: 'rgb(var(--text))' }}>{label}</span>}
      <input className={clsx('input', inputClassName)} {...rest} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}
