import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  let adminUser: any = null
  let loadFailed = false
  try {
    adminUser = await prisma.adminUser.findUnique({
      where: { email: session.email }
    })
  } catch (error) {
    console.error("Error fetching admin user:", error)
    loadFailed = true
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage system settings and configurations</p>
      </div>

      {loadFailed && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          <p className="text-sm font-medium">Failed to load your admin profile.</p>
          <p className="text-sm mt-1">
            The database could not be reached. Refresh the page to try again, or check the server logs if the problem persists.
          </p>
        </div>
      )}

      {!loadFailed && (
      <Card>
        <CardHeader>
          <CardTitle>Admin Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-medium">{adminUser?.full_name || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{adminUser?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{adminUser?.role}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">{new Date(adminUser?.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">System settings and configurations will be available here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
