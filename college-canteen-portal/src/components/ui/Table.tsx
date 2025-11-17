import React from 'react'
import clsx from 'clsx'

type TableRootProps = React.HTMLAttributes<HTMLTableElement>
export function Table({ className, ...rest }: TableRootProps) {
  return (
    <table className={clsx('w-full border-separate border-spacing-0 text-sm', className)} {...rest} />
  )
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}
export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={clsx('border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]/50', props.className)} {...props} />
}
export function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={clsx('p-2 text-[rgb(var(--text-muted))] font-medium text-left', props.className)} {...props} />
}
export function TD(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('p-2 align-top', props.className)} {...props} />
}
