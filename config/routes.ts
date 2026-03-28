export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/help",
  "/help/submission-service",
  "/help/technical-support",
  "/journals",
  "/journals/[id]",
  "/solutions",
  "/search",
  "/submit-manager",
  "/register",
  "/admin/login",
  "/admin/register",
  "/admin/registration-success",
  "/admin/verify-code",
]

export const ADMIN_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/journals",
  "/admin/submissions",
  "/admin/reviews",
  "/admin/analytics",
  "/admin/authors",
  "/admin/messages",
  "/admin/faq",
  "/admin/settings",
  "/admin/email-templates",
  "/admin/pricing",
]

export const API_ROUTES = ["/api"]

export function isPublicRoute(pathname: string): boolean {
  // Check exact matches first
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }

  // Check pattern matches (like /journals/[id])
  return PUBLIC_ROUTES.some((route) => {
    if (route.includes("[id]")) {
      const pattern = route.replace("[id]", "[^/]+")
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(pathname)
    }
    return false
  })
}

export const isAdminRoute = (pathname: string): boolean => ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))

export const isApiRoute = (pathname: string): boolean => API_ROUTES.some((route) => pathname.startsWith(route))

