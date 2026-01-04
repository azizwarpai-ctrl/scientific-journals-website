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
  "/submit-manager",
  "/login",
  "/register",
  "/admin/login",
  "/admin/register",
  "/admin/registration-success",
]

export const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/journals",
  "/admin/submissions",
  "/admin/reviews",
  "/admin/analytics",
  "/admin/authors",
  "/admin/messages",
  "/admin/faq",
  "/admin/settings",
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

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route))
}

export function isApiRoute(pathname: string): boolean {
  return API_ROUTES.some((route) => pathname.startsWith(route))
}
