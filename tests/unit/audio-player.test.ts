import { describe, it, expect, vi, beforeEach } from "vitest"

describe("AudioPlayer component", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("exports AudioPlayer and AudioPlayerProvider", async () => {
    const playerModule = await import("@/src/components/audio-player")
    expect(playerModule.AudioPlayer).toBeDefined()
    expect(typeof playerModule.AudioPlayer).toBe("function")

    const ctxModule = await import("@/src/components/audio-player-context")
    expect(ctxModule.AudioPlayerProvider).toBeDefined()
    expect(ctxModule.useAudioPlayerContext).toBeDefined()
  })
})

describe("Audio serve route helpers", () => {
  it("rejects path traversal in key segments", async () => {
    const routeModule = await import("@/app/api/audio/[...key]/route")

    const request = new Request("http://localhost/api/audio/../../etc/passwd")
    const response = await routeModule.GET(request, {
      params: Promise.resolve({ key: ["..", "..", "etc", "passwd"] }),
    })
    expect([400, 404, 503]).toContain(response.status)
  })

  it("returns 400 for empty key", async () => {
    const routeModule = await import("@/app/api/audio/[...key]/route")

    const request = new Request("http://localhost/api/audio/")
    const response = await routeModule.GET(request, {
      params: Promise.resolve({ key: [] }),
    })
    expect(response.status).toBe(400)
  })
})
