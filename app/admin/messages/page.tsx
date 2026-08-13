import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { Mail, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function MessagesPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Fetch messages with counts
  let messages: any[] = []
  let loadFailed = false
  try {
    messages = await prisma.message.findMany({
      orderBy: { created_at: "desc" }
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    loadFailed = true
  }

  const unreadCount = messages?.filter((m) => m.status === "unread").length || 0
  const repliedCount = messages?.filter((m) => m.status === "replied").length || 0
  const resolvedCount = messages?.filter((m) => m.status === "resolved").length || 0

  return (
    <div className="space-y-6">
      <PageHeader title="Messages & Support" subtitle="Manage submission help and technical support requests" />

      {loadFailed && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          <p className="text-sm font-medium">Failed to load messages.</p>
          <p className="text-sm mt-1">
            The database could not be reached. Refresh the page to try again, or check the server logs if the problem persists.
          </p>
        </div>
      )}

      {!loadFailed && (
      <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Messages" value={messages?.length || 0} icon={Mail} />
        <StatCard title="Unread" value={unreadCount} icon={AlertCircle} iconClassName="h-4 w-4 text-destructive" />
        <StatCard title="Replied" value={repliedCount} icon={Clock} iconClassName="h-4 w-4 text-blue-500" />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle2} iconClassName="h-4 w-4 text-green-500" />
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
      </>
      )}
    </div>
  )
}
