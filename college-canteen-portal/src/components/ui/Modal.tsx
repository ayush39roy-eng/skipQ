'use client'

import { useEffect, useRef } from 'react'

// createPortal workaround for TypeScript module resolution
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { createPortal } = require('react-dom') as { createPortal: (children: React.ReactNode, container: Element) => React.ReactPortal }

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {

  
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const previouslyFocused = document.activeElement as HTMLElement
      modalRef.current.focus()
      
      return () => {
        previouslyFocused?.focus()
      }
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // Prevent scrolling
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, onClose])
  if (!isOpen) return null

  // Ensure we are in the browser
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       {/* Backdrop */}
       <div 

         className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
         onClick={onClose}
       />
       
       {/* Modal Content */}
       <div 
         ref={modalRef}
         role="dialog"
         aria-modal="true"
         aria-labelledby="modal-title"
         tabIndex={-1}
         className="relative w-full max-w-lg transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all animate-in fade-in zoom-in-95 duration-200"
       >
          <div className="flex items-center justify-between mb-4">
             <h3 id="modal-title" className="text-lg font-bold leading-6 text-gray-900">
                {title}
             </h3>
             <button 
               onClick={onClose}
               aria-label="Close modal"
               className="rounded-full p-1 hover:bg-gray-100 transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
          
          <div className="mt-2">
             {children}
          </div>
       </div>
    </div>,
    document.body
  )
}
