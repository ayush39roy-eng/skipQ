import { ReactNode } from 'react'

/**
 * Data Table Component
 * 
 * Clean, professional table for admin data display.
 */

type Column<T> = {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No data found',
  onRowClick
}: DataTableProps<T>) {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`align-${col.align || 'left'}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-state">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={index}
                className={onRowClick ? 'clickable' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`align-${col.align || 'left'}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <style jsx>{`
        .data-table-container {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: #FAFAFA;
          border-bottom: 1px solid #E5E5E5;
        }

        .data-table th {
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #666666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .data-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #1A1A1A;
          border-bottom: 1px solid #F3F4F6;
        }

        .data-table tbody tr:hover {
          background: #FAFAFA;
        }

        .data-table tbody tr.clickable {
          cursor: pointer;
        }

        .data-table tbody tr.clickable:hover {
          background: #F0F9FF;
        }

        .data-table tbody tr:last-child td {
          border-bottom: none;
        }

        .align-left {
          text-align: left;
        }

        .align-right {
          text-align: right;
        }

        .align-center {
          text-align: center;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999999;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
