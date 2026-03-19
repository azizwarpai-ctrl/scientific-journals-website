export const getSsoSecret = () => {
    const s = process.env.SSO_SECRET
    if (!s) {
        throw new Error("CRITICAL: SSO_SECRET is missing from environment variables!")
    }
    return s
}

