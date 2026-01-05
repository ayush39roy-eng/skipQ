'use client'

import { ReactNode } from 'react'
import { AdminNav } from '@/components/admin/AdminNav'

/**
 * Admin Layout
 * 
 * Root layout for admin control panel.
 */

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-layout">
      <AdminNav />
      <main className="admin-main">
        {children}
      </main>

      <style jsx global>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          background: #FAFAFA;
          color: #1A1A1A;
        }

        * {
          box-sizing: border-box;
        }

        .admin-layout {
          display: flex;
          min-height: 100vh;
        }

        .admin-main {
          margin-left: 240px;
          flex: 1;
          padding: 32px;
          max-width: 1600px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 600;
          color: #1A1A1A;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          font-size: 15px;
          color: #666666;
          margin: 0;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1A1A1A;
          margin: 32px 0 16px 0;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .btn {
          display: inline-block;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-primary {
          background: #2563EB;
          color: #FFFFFF;
        }

        .btn-primary:hover {
          background: #1D4ED8;
        }

        .btn-secondary {
          background: #FFFFFF;
          color: #1A1A1A;
          border: 1px solid #E5E5E5;
        }

        .btn-secondary:hover {
          background: #FAFAFA;
        }

        .btn-danger {
          background: #DC2626;
          color: #FFFFFF;
        }

        .btn-danger:hover {
          background: #B91C1C;
        }

        .currency {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  )
}
