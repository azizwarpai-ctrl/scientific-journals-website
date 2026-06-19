import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const hoisted = vi.hoisted(() => {
    const upsertAdmin = vi.fn().mockResolvedValue({})
    const upsertSetting = vi.fn().mockResolvedValue({})
    const upsertAbout = vi.fn().mockResolvedValue({})
    const deleteManyAbout = vi.fn().mockResolvedValue({ count: 0 })
    const upsertCategory = vi.fn().mockResolvedValue({ id: 1n })
    const findFirstTopic = vi.fn().mockResolvedValue({ id: 1n })
    const createTopic = vi.fn().mockResolvedValue({})
    const executeRaw = vi.fn().mockResolvedValue(undefined)
    const disconnect = vi.fn().mockResolvedValue(undefined)

    const prismaInstance = {
        $executeRawUnsafe: executeRaw,
        $disconnect: disconnect,
        adminUser: { upsert: upsertAdmin },
        systemSetting: { upsert: upsertSetting },
        aboutSection: { upsert: upsertAbout, deleteMany: deleteManyAbout },
        helpCategory: { upsert: upsertCategory },
        helpTopic: { findFirst: findFirstTopic, create: createTopic },
    }

    return { prismaInstance, upsertAdmin }
})

vi.mock("@prisma/client", () => ({
    PrismaClient: class FakePrismaClient {
        $executeRawUnsafe = hoisted.prismaInstance.$executeRawUnsafe
        $disconnect = hoisted.prismaInstance.$disconnect
        adminUser = hoisted.prismaInstance.adminUser
        systemSetting = hoisted.prismaInstance.systemSetting
        aboutSection = hoisted.prismaInstance.aboutSection
        helpCategory = hoisted.prismaInstance.helpCategory
        helpTopic = hoisted.prismaInstance.helpTopic
    },
}))

vi.mock("@prisma/adapter-mariadb", () => ({
    PrismaMariaDb: class FakeAdapter {},
}))

vi.mock("bcryptjs", () => ({
    default: { hash: vi.fn().mockResolvedValue("$2a$10$hashed_value") },
}))

const savedEnv: Record<string, string | undefined> = {}
const envKeys = [
    "ALLOW_PROD_DB_INIT",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "SUPPORT_EMAIL",
    "SUPPORT_PASSWORD",
]

describe("initializeDatabase — credential safety", () => {
    beforeEach(() => {
        for (const k of envKeys) savedEnv[k] = process.env[k]

        process.env.ALLOW_PROD_DB_INIT = "true"
        process.env.ADMIN_EMAIL = "admin@test.com"
        process.env.ADMIN_PASSWORD = "env-password-admin"
        process.env.SUPPORT_EMAIL = "support@test.com"
        process.env.SUPPORT_PASSWORD = "env-password-support"

        hoisted.upsertAdmin.mockReset()
        hoisted.upsertAdmin.mockResolvedValue({})
    })

    afterEach(() => {
        for (const k of envKeys) {
            if (savedEnv[k] === undefined) delete process.env[k]
            else process.env[k] = savedEnv[k]
        }
        vi.resetModules()
    })

    it("does NOT overwrite password_hash on existing accounts (update block is empty)", async () => {
        const { initializeDatabase } = await import("@/src/lib/db/init")
        await initializeDatabase()

        const calls = hoisted.upsertAdmin.mock.calls
        expect(calls.length).toBe(2)

        for (const call of calls) {
            const arg = call[0]
            expect(arg.update).toEqual({})
        }
    })

    it("sets password_hash in the create block (first-boot seeding works)", async () => {
        const { initializeDatabase } = await import("@/src/lib/db/init")
        await initializeDatabase()

        const calls = hoisted.upsertAdmin.mock.calls
        const adminCall = calls.find((c: any[]) => c[0].where?.email === "admin@test.com")
        const supportCall = calls.find((c: any[]) => c[0].where?.email === "support@test.com")

        expect(adminCall).toBeDefined()
        expect(adminCall![0].create.password_hash).toBe("$2a$10$hashed_value")
        expect(adminCall![0].create.role).toBe("super_admin")

        expect(supportCall).toBeDefined()
        expect(supportCall![0].create.password_hash).toBe("$2a$10$hashed_value")
        expect(supportCall![0].create.role).toBe("admin")
    })

    it("throws when env credentials are missing (no fallback defaults)", async () => {
        delete process.env.ADMIN_PASSWORD
        const { initializeDatabase } = await import("@/src/lib/db/init")
        await expect(initializeDatabase()).rejects.toThrow("Missing required seed credentials")
    })
})
