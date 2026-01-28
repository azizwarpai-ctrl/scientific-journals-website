"use client"

import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/php-api-client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface LoginInput {
  email: string
  password: string
}

export interface Verify2FAInput {
  tempToken: string
  otp: string
}

export interface ResendOTPInput {
  tempToken: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginInput) => {
      return await authAPI.login(data.email, data.password)
    },
  })
}

export function useVerify2FA() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Verify2FAInput) => {
      return await authAPI.verify2FA(data.tempToken, data.otp)
    },
    onSuccess: (data) => {
      // Invalidate and refetch user query
      queryClient.setQueryData(["user"], data.user)
      queryClient.invalidateQueries({ queryKey: ["user"] })
      router.push("/admin/dashboard")
      router.refresh()
    },
  })
}

export function useResendOTP() {
  return useMutation({
    mutationFn: async (data: ResendOTPInput) => {
      return await authAPI.resendOTP(data.tempToken)
    },
  })
}

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await authAPI.logout()
    },
    onSuccess: () => {
      queryClient.clear()
      router.push("/admin/login")
      router.refresh()
    },
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const data = await authAPI.me()
        return data.user || data
      } catch (error) {
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
