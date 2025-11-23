import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold">Not Found</h2>
            <p className="mt-2 text-muted-foreground">Could not find requested resource</p>
            <Link href="/" className="mt-4 btn btn-primary">
                Return Home
            </Link>
        </div>
    )
}
