"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Inbox, Clock, CheckCircle2, XCircle } from "lucide-react"

import { useGetEmailLogs } from "@/src/features/email-templates/api/use-get-email-logs"
import type { EmailLog } from "@/src/features/email-templates/types/email-template-type"

type PopulatedEmailLog = EmailLog & { template?: { name: string } }

export default function EmailLogsPage() {
  const limit = 20
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState("all")

  const { data: logsData, isLoading: loading } = useGetEmailLogs(page, limit, activeTab)
  const logs = logsData?.data || []
  const pagination = logsData?.pagination || null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Sent</Badge>
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge>
      case "pending":
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/email-templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Delivery Logs</h1>
          <p className="text-muted-foreground">View the status of system emails sent to users</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery History</CardTitle>
              <CardDescription>Recent outbound emails</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Loading logs...</div>
              ) : logs.length > 0 ? (
                <div className="border rounded-md divide-y">
                  {logs.map((log: PopulatedEmailLog) => (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.to_email}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-sm text-foreground">{log.subject}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {log.template?.name ? (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                              {log.template.name}
                            </span>
                          ) : (
                            <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground/70">
                              raw-email (no template)
                            </span>
                          )}
                          <span>
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-2 bg-destructive/10 p-2 rounded max-w-2xl font-mono whitespace-pre-wrap break-all">
                            Error: {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border rounded-md bg-muted/20">
                  <Inbox className="h-8 w-8 mb-2 opacity-20" />
                  <p>No email logs found for this status</p>
                </div>
              )}

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
