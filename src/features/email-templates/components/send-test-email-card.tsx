import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"

interface Props {
  testEmail: string
  setTestEmail: (val: string) => void
  sendingTest: boolean
  handleSendTest: () => void
}

export function SendTestEmailCard({ testEmail, setTestEmail, sendingTest, handleSendTest }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Send Test Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="recipient@example.com"
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleSendTest}
          disabled={!testEmail || sendingTest}
        >
          {sendingTest ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {sendingTest ? "Sending..." : "Send Test"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sends a test email with sample variable values. Requires SMTP to be configured.
        </p>
      </CardContent>
    </Card>
  )
}
