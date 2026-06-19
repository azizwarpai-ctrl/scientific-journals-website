import { sendEmail } from "@/src/lib/email/service"

export async function sendOtpEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to,
    subject: "Your DigitoPub verification code",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#333">Your verification code</h2>
<p>Use the code below to complete your sign-in. It expires in 5 minutes.</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px">${code}</p>
<p style="color:#666;font-size:14px">If you did not request this code, you can safely ignore this email.</p>
</div>`,
    text: `Your DigitoPub verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, you can safely ignore this email.`,
  })
}
