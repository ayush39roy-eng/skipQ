interface LoaderProps {
    size?: 'small' | 'medium' | 'large'
    className?: string
}

export function Loader({ size = 'medium', className = '' }: LoaderProps) {
    const sizeClasses = {
        small: 'h-4 w-4 border-2',
        medium: 'h-6 w-6 border-2',
        large: 'h-10 w-10 border-4'
    }

    return (
        <div
            className={`inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${className}`}
            role="status"
        >
            <span className="sr-only">Loading...</span>
        </div>
    )
}
