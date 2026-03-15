"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLogin } from "@/src/features/auth"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface LoginFormProps {
  journalTitle?: string
  journalLogoUrl?: string
  returnUrl?: string
}

export function LoginForm({ journalTitle, journalLogoUrl, returnUrl }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { mutate, isPending, error } = useLogin()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    mutate(
      { email, password },
      {
        onSuccess: () => {
          // If a specific return URL was provided (like an SSO redirect), go there
          if (returnUrl) {
            router.push(returnUrl)
          } else {
            router.push("/admin/dashboard")
          }
          router.refresh()
        },
      }
    )
  }

  const defaultTitle = "Welcome Back"
  const defaultDesc = "Login to your account to access all journals"
  
  const title = journalTitle ? `Sign in to ${journalTitle}` : defaultTitle
  const desc = journalTitle ? "Enter your credentials to continue" : defaultDesc

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mb-4 flex justify-center lg:hidden">
          {journalLogoUrl ? (
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
              <img 
                src={journalLogoUrl} 
                alt={`${journalTitle} Logo`}
                className="h-full w-full object-contain p-2"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
              <span className="font-mono text-2xl font-bold text-primary-foreground">dis</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        
        {error && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Login failed"}
            </p>
          </div>
        )}
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link href={`/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="font-medium text-primary hover:underline">
          Register now
        </Link>
      </div>

      {!journalTitle && (
        <div className="mt-6 border-t pt-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Or access a specific journal</p>
          <Button variant="outline" className="w-full bg-transparent" asChild>
            <Link href="/journals">Browse Journals</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
