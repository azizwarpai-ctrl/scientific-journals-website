'use client';

import { AlertOctagon } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="min-h-screen bg-[#0f172a] text-white font-sans flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-8">

                    {/* Emergency Icon */}
                    <div className="flex justify-center">
                        <div className="bg-red-500/10 p-6 rounded-full animate-pulse ring-4 ring-red-500/20">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-black uppercase tracking-widest text-red-500">
                            Critical Failure
                        </h1>
                        <p className="text-slate-400">
                            The application encountered a catastrophic error at the root level.
                            <br />
                            <span className="text-xs font-mono opacity-50 mt-2 block">{error.message}</span>
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            // Hard reload for global errors
                            window.location.reload();
                        }}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg uppercase tracking-wider shadow-lg shadow-red-900/20 transition-all active:scale-95"
                    >
                        Emergency Restart
                    </button>

                    <p className="text-xs text-slate-600 font-mono">
                        SYS_HALT // CODE: {error.digest || 'CRITICAL_EXCEPTION'}
                    </p>
                </div>
            </body>
        </html>
    );
}
