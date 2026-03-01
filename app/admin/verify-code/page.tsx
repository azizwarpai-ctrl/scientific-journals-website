"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { ShieldCheck, RefreshCw } from "lucide-react"

export default function VerifyCodePage() {
    const [code, setCode] = useState(["", "", "", "", "", ""])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || ""
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    // If no email param, redirect back to login
    useEffect(() => {
        if (!email) {
            router.push("/admin/login")
        }
    }, [email, router])

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste
            const chars = value.replace(/\D/g, "").slice(0, 6).split("")
            const newCode = [...code]
            chars.forEach((char, i) => {
                if (index + i < 6) newCode[index + i] = char
            })
            setCode(newCode)
            const nextIndex = Math.min(index + chars.length, 5)
            inputRefs.current[nextIndex]?.focus()
            return
        }

        if (!/^\d*$/.test(value)) return

        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        const fullCode = code.join("")

        if (fullCode.length !== 6) {
            setError("Please enter the complete 6-digit code")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/auth/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: fullCode }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Verification failed")
            }

            router.push("/admin/dashboard")
            router.refresh()
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Verification failed")
            setCode(["", "", "", "", "", ""])
            inputRefs.current[0]?.focus()
        } finally {
            setIsLoading(false)
        }
    }

    const handleResend = async () => {
        if (resendCooldown > 0) return

        setIsResending(true)
        setError(null)
        setSuccessMessage(null)

        try {
            const response = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to resend code")
            }

            setSuccessMessage("A new verification code has been sent to your email.")
            setResendCooldown(60) // 60 second cooldown
            setCode(["", "", "", "", "", ""])
            inputRefs.current[0]?.focus()
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to resend code")
        } finally {
            setIsResending(false)
        }
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
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Identity</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-center">Enter Verification Code</CardTitle>
                        <CardDescription className="text-center">
                            The code expires in 5 minutes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleVerify}>
                            <div className="flex flex-col gap-6">
                                {/* OTP Input Grid */}
                                <div className="flex justify-center gap-3">
                                    {code.map((digit, index) => (
                                        <Input
                                            key={index}
                                            ref={(el) => { inputRefs.current[index] = el }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={digit}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-14 text-center text-2xl font-bold"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                        <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                                    </div>
                                )}

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Verifying..." : "Verify & Continue"}
                                </Button>

                                <div className="text-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResend}
                                        disabled={isResending || resendCooldown > 0}
                                        className="text-sm"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-1 ${isResending ? "animate-spin" : ""}`} />
                                        {resendCooldown > 0
                                            ? `Resend code in ${resendCooldown}s`
                                            : isResending
                                                ? "Resending..."
                                                : "Resend verification code"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
