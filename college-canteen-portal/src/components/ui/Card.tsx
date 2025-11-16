import React from 'react'
import clsx from 'clsx'

type CardProps<T extends React.ElementType = 'div'> = {
  as?: T
  padding?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

export function Card<T extends React.ElementType = 'div'>(
  { as, padding = 'md', className, children, ...rest }: CardProps<T>
) {
  const Tag = (as || 'div') as React.ElementType
  const pad = padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-7' : 'p-5'
  return (
    <Tag className={clsx('card', pad, className)} {...rest}>{children}</Tag>
  )
}
