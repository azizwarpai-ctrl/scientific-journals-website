import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Mail, Calendar, User } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  let message: any = null
  try {
    message = await prisma.message.findUnique({
      where: { id: BigInt(id) }
    })
  } catch (error) {
    console.error("Error fetching message:", error)
  }

  if (!message) {
    return <div>Message not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Details</h1>
          <p className="text-muted-foreground">View and respond to support request</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{message.subject}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={message.status === "unread" ? "destructive" : "secondary"}>{message.status}</Badge>
                    <Badge variant="outline">{message.message_type.replace("_", " ")}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message Content</Label>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                </div>
              </div>

              {message.response && (
                <div className="space-y-2">
                  <Label>Admin Response</Label>
                  <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
                    <p className="whitespace-pre-wrap text-sm">{message.response}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Responded at: {new Date(message.responded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send Response</CardTitle>
              <CardDescription>Reply to this support request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  placeholder="Type your response here..."
                  className="min-h-[150px]"
                  defaultValue={message.response || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Update Status</Label>
                <Select defaultValue={message.status}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">Send Response</Button>
                <Button variant="outline">Mark as Resolved</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{message.name}</p>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{message.email}</p>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{new Date(message.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-sm">
                {message.message_type === "submission_help" && "Submission Help"}
                {message.message_type === "technical_support" && "Technical Support"}
                {message.message_type === "contact" && "General Contact"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
