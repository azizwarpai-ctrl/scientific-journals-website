"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { messagesAPI } from "@/lib/php-api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Clock, CheckCircle2, AlertCircle, User, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function MessagesPage() {
  const { data: session, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/admin/login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    async function fetchMessages() {
      if (!session) return
      try {
        const response = await messagesAPI.list(1, 100)
        setMessages(response.data || [])
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [session])

  if (authLoading || (loading && session)) {
    return <div className="p-8">Loading messages...</div>
  }

  if (!session) return null

  const unreadCount = messages.filter((m) => m.status === "unread").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages & Support</h1>
        <p className="text-muted-foreground">Manage submission help and technical support requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Messages</CardTitle>
              <CardDescription>View and manage all support requests</CardDescription>
            </div>
            <Input className="w-64" placeholder="Search messages..." />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.subject}</p>
                        <Badge variant={message.status === "unread" ? "destructive" : "secondary"}>
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {message.name} ({message.email})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No messages found</div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {messages.filter(m => m.status === 'unread').length > 0 ? (
                messages.filter(m => m.status === 'unread').map((message) => (
                  <div
                    key={message.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.subject}</p>
                        <Badge variant="destructive">
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {message.name} ({message.email})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No unread messages found</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Detail Modal */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>View and respond to support request</DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="grid gap-6">
              {/* Message Content */}
              <div className="space-y-6">
                <Card className="border-none shadow-none">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{selectedMessage.subject}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedMessage.status === "unread" ? "destructive" : "secondary"}>
                            {selectedMessage.status}
                          </Badge>
                          <Badge variant="outline">
                            {selectedMessage.message_type?.replace("_", " ") || "Support"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedMessage.name}</p>
                          <p className="text-xs text-muted-foreground">Name</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedMessage.email}</p>
                          <p className="text-xs text-muted-foreground">Email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(selectedMessage.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Date</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label>Message Content</Label>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="whitespace-pre-wrap text-sm">{selectedMessage.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Form */}
                <Card className="border-none shadow-none pt-4 border-t rounded-none">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg">Send Response</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="response">Your Response</Label>
                      <Textarea
                        id="response"
                        placeholder="Type your response here..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1">Send Response</Button>
                      <Button variant="outline">Mark as Resolved</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
