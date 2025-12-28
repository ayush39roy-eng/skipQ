'use client'

import { useEffect, useRef } from 'react'
export type ToastType = 'SUCCESS' | 'ERROR'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      role={type === 'ERROR' ? 'alert' : 'status'}
      aria-live={type === 'ERROR' ? 'assertive' : 'polite'}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2 fade-in duration-300 ${
      type === 'SUCCESS' ? 'bg-white border-emerald-500 text-emerald-700' : 'bg-white border-red-500 text-red-700'
    }`}>
      {type === 'SUCCESS' ? (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      ) : (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      )}
      <span className="font-bold text-sm">{message}</span>
      <button 
        onClick={onClose}
        aria-label="Close notification"
        className="ml-2 p-1 rounded-full hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  )
}
