'use client';

import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="max-w-md w-full text-center relative z-10 space-y-8">
        {/* Status Code Block */}
        <div className="relative inline-block">
          <h1 className="text-[9rem] font-black leading-none text-primary/10 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileQuestion className="w-24 h-24 text-primary" />
          </div>
        </div>

        {/* Message Block */}
        <div className="space-y-4 border-l-4 border-accent pl-6 text-left bg-muted/30 p-4 rounded-r-lg">
          <h2 className="text-xl font-bold uppercase tracking-widest text-accent flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            Resource Not Found
          </h2>
          <p className="text-muted-foreground">
            The requested component or directory listing could not be located in the current operational logic. It may have been relocated or decommissioned.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-input bg-background hover:bg-muted text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Return Previous
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold uppercase tracking-wide shadow-lg shadow-primary/20"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {/* Technical Footer */}
        <div className="pt-12 text-xs text-muted-foreground font-mono opacity-50">
          SYSTEM_ID: DIGITOPUB_V2 // ERR_REF: 0x404 // {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
