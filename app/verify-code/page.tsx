import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { VerifyCodeForm } from "@/src/features/auth/components/verify/verify-code-form"

interface PageProps {
    searchParams: Promise<{ email?: string }>;
}

export default async function PublicVerifyCodePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const cookieStore = await cookies();
    
    // Legacy redirect flow: if email is in params, set cookie and redirect to clean URL
    if (params.email) {
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        (await cookies()).set("verify_email", params.email, {
            expires,
            path: "/",
            sameSite: "lax",
        });
        redirect("/verify-code");
    }

    // Strictly read from cookie for rendering
    const email = cookieStore.get("verify_email")?.value || "";

    if (!email) {
        redirect("/login")
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <Link href="/">
                        <Image
                            src="/images/logodigitopub.png"
                            alt="DigitoPub Logo"
                            width={180}
                            height={60}
                            className="mx-auto mb-4 hover:opacity-80 transition-opacity"
                        />
                    </Link>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Email</h1>
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
                        <VerifyCodeForm key={email} email={email} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

