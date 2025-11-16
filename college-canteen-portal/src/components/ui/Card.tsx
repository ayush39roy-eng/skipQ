import React from 'react'
import clsx from 'clsx'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: keyof JSX.IntrinsicElements
  padding?: 'sm'|'md'|'lg'
}

export function Card({ as:Tag='div', padding='md', className, children, ...rest }: CardProps) {
  const pad = padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-7' : 'p-5'
  return (
    <Tag className={clsx('card', pad, className)} {...rest}>{children}</Tag>
  )
}
