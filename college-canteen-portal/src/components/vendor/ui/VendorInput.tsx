import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface VendorInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const VendorInput = forwardRef<HTMLInputElement, VendorInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--vendor-text-secondary)]">{label}</label>}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full rounded-md border bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] placeholder-[var(--vendor-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--vendor-accent)] 
            ${error ? 'border-[var(--vendor-danger)] focus:ring-[var(--vendor-danger)]' : 'border-[var(--vendor-border)]'}
            ${className || ''}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--vendor-danger)]">{error}</p>}
      </div>
    )
  }
)
VendorInput.displayName = 'VendorInput'
