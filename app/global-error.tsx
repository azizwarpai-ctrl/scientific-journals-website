"use client"

export default function GlobalError({
    error,
    reset,
}: {
    error: any
    reset: any
}) {
    return (
        <html lang="en">
            <body>
                <div>
                    <h2>Something went wrong!</h2>
                    <button onClick={() => reset()}>Try again</button>
                </div>
            </body>
        </html>
    )
}
