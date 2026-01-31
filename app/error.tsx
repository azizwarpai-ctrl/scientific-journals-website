'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground">
            <div className="max-w-lg w-full bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
                {/* Header - Danger Stripe */}
                <div className="bg-destructive/10 border-b border-destructive/20 p-4 flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-destructive uppercase tracking-wide">System Malfunction</h1>
                        <p className="text-xs text-destructive/80 font-mono">ERR_CODE: 500_INTERNAL_ERROR</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Unexpected Operational Fault</h2>
                        <p className="text-muted-foreground">
                            The system encountered a critical exception while processing your request. Diagnostics have been logged.
                        </p>
                    </div>

                    {/* Terminal Error Output */}
                    <div className="bg-sidebar text-sidebar-foreground p-4 rounded-md font-mono text-sm overflow-x-auto border border-sidebar-border">
                        <div className="flex gap-2 text-muted-foreground mb-2 pb-2 border-b border-sidebar-border">
                            <span className="w-3 h-3 rounded-full bg-destructive"></span>
                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            <span className="ml-auto text-xs">console.log</span>
                        </div>
                        <p className="text-destructive font-bold">$ error_trace --verbose</p>
                        <p className="opacity-80 mt-1 whitespace-pre-wrap word-break-break-word">
                            {error.message || "Unknown system error occurred."}
                        </p>
                        {error.digest && (
                            <p className="mt-2 text-xs opacity-50 text-blue-400">Digest: {error.digest}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => reset()}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-md"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset System
                        </button>

                        <Link
                            href="/"
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-input bg-background hover:bg-muted rounded-md transition-colors text-foreground font-medium"
                        >
                            <Home className="w-4 h-4" />
                            Return to Base
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-muted/50 p-2 text-center text-[10px] text-muted-foreground uppercase tracking-wider">
                    Automated Recovery Protocol Initiated
                </div>
            </div>
        </div>
    );
}
