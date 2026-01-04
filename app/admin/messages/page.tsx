import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function MessagesPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  // Fetch messages with counts
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })

  const unreadCount = messages?.filter((m) => m.status === "unread").length || 0
  const repliedCount = messages?.filter((m) => m.status === "replied").length || 0
  const resolvedCount = messages?.filter((m) => m.status === "resolved").length || 0

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
            <div className="text-2xl font-bold">{messages?.length || 0}</div>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replied</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repliedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedCount}</div>
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
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="replied">Replied</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.subject}</p>
                        <Badge variant={message.status === "unread" ? "destructive" : "secondary"}>
                          {message.status}
                        </Badge>
                        <Badge variant="outline">{message.message_type.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {message.name} ({message.email})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleDateString()} at{" "}
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/admin/messages/${message.id}`}>View Details</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No messages found</div>
              )}
            </TabsContent>

            <TabsContent value="unread">
              {messages?.filter((m) => m.status === "unread").length > 0 ? (
                messages
                  .filter((m) => m.status === "unread")
                  .map((message) => (
                    <div key={message.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{message.subject}</p>
                          <Badge variant="destructive">unread</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: {message.name} ({message.email})
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/admin/messages/${message.id}`}>View Details</Link>
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No unread messages</div>
              )}
            </TabsContent>

            <TabsContent value="replied">
              {messages?.filter((m) => m.status === "replied").length > 0 ? (
                messages
                  .filter((m) => m.status === "replied")
                  .map((message) => (
                    <div key={message.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{message.subject}</p>
                          <Badge>replied</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: {message.name} ({message.email})
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/admin/messages/${message.id}`}>View Details</Link>
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No replied messages</div>
              )}
            </TabsContent>

            <TabsContent value="resolved">
              {messages?.filter((m) => m.status === "resolved").length > 0 ? (
                messages
                  .filter((m) => m.status === "resolved")
                  .map((message) => (
                    <div key={message.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{message.subject}</p>
                          <Badge variant="outline">resolved</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: {message.name} ({message.email})
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link href={`/admin/messages/${message.id}`}>View Details</Link>
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No resolved messages</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
