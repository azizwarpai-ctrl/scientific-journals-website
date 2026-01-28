"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useLogin, useVerify2FA, useResendOTP } from "@/lib/client/hooks/useAuth"

type LoginStep = "credentials" | "verify-2fa"

export default function AdminLoginPage() {
  const [step, setStep] = useState<LoginStep>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [tempToken, setTempToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const loginMutation = useLogin()
  const verify2FAMutation = useVerify2FA()
  const resendOTPMutation = useResendOTP()

  const isLoading = loginMutation.isPending || verify2FAMutation.isPending || resendOTPMutation.isPending

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          // Check if 2FA is required
          if (data.twoFactorRequired && data.tempToken) {
            setTempToken(data.tempToken)
            setStep("verify-2fa")
          }
        },
        onError: (error) => {
          setError(error.message)
        },
      }
    )
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    verify2FAMutation.mutate(
      { tempToken, otp },
      {
        onError: (error) => {
          setError(error.message)
        },
      }
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/images/logodigitopub.png"
            alt="DigitoPub Logo"
            width={180}
            height={60}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to manage your scientific journals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === "credentials" ? "Admin Login" : "Verify Your Identity"}
            </CardTitle>
            <CardDescription>
              {step === "credentials"
                ? "Enter your admin credentials to access the dashboard"
                : "Enter the 6-digit code sent to your email"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
              <form onSubmit={handleInitialLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@digitopub.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <Link href="/" className="underline underline-offset-4 hover:text-primary">
                    Back to main site
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify2FA}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-2xl tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Check your email ({email}) for the code
                    </p>
                  </div>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null)
                        resendOTPMutation.mutate(
                          { tempToken },
                          {
                            onSuccess: () => {
                              setError("Code resent! Check your email.")
                            },
                            onError: (error) => {
                              setError(error.message)
                            },
                          }
                        )
                      }}
                      disabled={isLoading}
                    >
                      Resend Code
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep("credentials")
                        setOtp("")
                        setError(null)
                      }}
                    >
                      Back to Login
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
