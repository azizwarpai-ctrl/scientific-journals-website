"use client"

import { Toaster } from "sonner"
import { useTheme } from "next-themes"

export function GlobalToaster() {
  const { theme } = useTheme()
  
  return (
    <Toaster 
      richColors 
      closeButton 
      position="top-center" 
      theme={theme === "dark" ? "dark" : theme === "system" ? "system" : "light"} 
    />
  )
}
