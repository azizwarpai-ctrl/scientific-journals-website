export const getSsoSecret = () => {
    const s = process.env.SSO_SECRET
    if (!s) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("CRITICAL: SSO_SECRET missing in production!")
        }
        console.warn("[WARNING] Missing SSO_SECRET; using local fallback.")
        return "default_development_sso_secret"
    }
    return s
}
