'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from './Button'

type FormSubmitButtonProps = {
  children: React.ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function FormSubmitButton({ children, pendingLabel, variant, size, className }: FormSubmitButtonProps) {
  const { pending } = useFormStatus()
  const fallbackLabel = typeof children === 'string' ? children : 'Processing...'
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      loading={pending}
      disabled={pending}
    >
      {pending ? (pendingLabel ?? fallbackLabel) : children}
    </Button>
  )
}
