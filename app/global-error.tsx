"use client"

import * as React from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body>
                <div style={{
                    display: 'flex',
                    minHeight: '100vh',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    textAlign: 'center',
                    fontFamily: 'sans-serif'
                }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        Something went wrong!
                    </h2>
                    <p style={{ marginBottom: '2rem', color: '#666' }}>
                        {error?.message || "A global application error has occurred."}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#000',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
