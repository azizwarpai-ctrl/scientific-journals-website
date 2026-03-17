"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { AlertBanner } from "@/components/ui/alert-banner"
import { RefreshCw } from "lucide-react"

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"

import { useVerifyCode } from "../../api/use-verify-code"
import { useResendCode } from "../../api/use-resend-code"
import { verifyCodeSchema, type VerifyCodeInput } from "../../schemas/auth-schema"

interface VerifyCodeFormProps {
    email: string;
}

export function VerifyCodeForm({ email }: VerifyCodeFormProps) {
    const router = useRouter()
    const [resendCooldown, setResendCooldown] = useState(0)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const verifyMutation = useVerifyCode()
    const resendMutation = useResendCode()

    const form = useForm<VerifyCodeInput>({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: { email, code: "" }
    })

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const onSubmit = (data: VerifyCodeInput) => {
        form.clearErrors("root")
        verifyMutation.mutate(data, {
            onSuccess: () => {
                router.push("/login?verified=true")
                router.refresh()
            },
            onError: (error) => {
                form.setError("root", { message: error.message || "Verification failed" })
                form.setValue("code", "")
            }
        })
    }

    const handleResend = () => {
        if (resendCooldown > 0 || resendMutation.isPending) return

        form.clearErrors("root")
        setSuccessMessage(null)

        resendMutation.mutate({ email }, {
            onSuccess: () => {
                setSuccessMessage("A new verification code has been sent to your email.")
                setResendCooldown(60) // 60 second cooldown
                form.setValue("code", "")
            },
            onError: (error) => {
                form.setError("root", { message: error.message || "Failed to resend code" })
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col gap-6">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem className="flex flex-col items-center">
                                <FormControl>
                                    <InputOTP
                                        maxLength={6}
                                        disabled={verifyMutation.isPending}
                                        {...field}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} className="w-12 h-14 text-2xl font-bold" />
                                            <InputOTPSlot index={1} className="w-12 h-14 text-2xl font-bold" />
                                            <InputOTPSlot index={2} className="w-12 h-14 text-2xl font-bold" />
                                            <InputOTPSlot index={3} className="w-12 h-14 text-2xl font-bold" />
                                            <InputOTPSlot index={4} className="w-12 h-14 text-2xl font-bold" />
                                            <InputOTPSlot index={5} className="w-12 h-14 text-2xl font-bold" />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {form.formState.errors.root?.message && (
                        <AlertBanner variant="error" message={form.formState.errors.root.message} />
                    )}

                    {successMessage && (
                        <AlertBanner variant="success" message={successMessage} />
                    )}

                    <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                        {verifyMutation.isPending ? "Verifying..." : "Verify Account"}
                    </Button>

                    <div className="text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResend}
                            disabled={resendMutation.isPending || resendCooldown > 0}
                            className="text-sm"
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                            {resendCooldown > 0
                                ? `Resend code in ${resendCooldown}s`
                                : resendMutation.isPending
                                    ? "Resending..."
                                    : "Resend verification code"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    )
}

