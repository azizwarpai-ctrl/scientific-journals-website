import { prisma } from "./config"
export * from "./auth-edge"

export async function verifyAdmin(userId: string): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({
    where: { id: BigInt(userId) },
    select: { role: true },
  })

  return user?.role === "admin" || user?.role === "superadmin"
}
