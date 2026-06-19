import { NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
}

function resolveStorageRoot(): string | null {
  const root = process.env.AUDIO_STORAGE_DIR
  if (!root || root.length === 0) return null
  return path.resolve(root)
}

function resolveFilePath(root: string, keySegments: string[]): string | null {
  const decoded = keySegments.map(decodeURIComponent)
  const joined = path.join(root, ...decoded)
  const resolved = path.resolve(joined)
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null
  return resolved
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  if (!key || key.length === 0) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 })
  }

  const root = resolveStorageRoot()
  if (!root) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
  }

  const filePath = resolveFilePath(root, key)
  if (!filePath) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  let stat: Awaited<ReturnType<typeof fs.stat>>
  try {
    stat = await fs.stat(filePath)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = AUDIO_CONTENT_TYPES[ext] || "application/octet-stream"
  const fileSize = stat.size

  const rangeHeader = request.headers.get("range")

  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader)
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      })
    }

    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      })
    }

    const chunkSize = end - start + 1
    const fileHandle = await fs.open(filePath, "r")
    const stream = fileHandle.createReadStream({ start, end, autoClose: true })
    const webStream = readableNodeToWeb(stream)

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  const fileHandle = await fs.open(filePath, "r")
  const stream = fileHandle.createReadStream({ autoClose: true })
  const webStream = readableNodeToWeb(stream)

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  if (!key || key.length === 0) {
    return new NextResponse(null, { status: 400 })
  }

  const root = resolveStorageRoot()
  if (!root) {
    return new NextResponse(null, { status: 503 })
  }

  const filePath = resolveFilePath(root, key)
  if (!filePath) {
    return new NextResponse(null, { status: 400 })
  }

  let stat: Awaited<ReturnType<typeof fs.stat>>
  try {
    stat = await fs.stat(filePath)
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = AUDIO_CONTENT_TYPES[ext] || "application/octet-stream"

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
    },
  })
}

function readableNodeToWeb(
  nodeStream: import("node:fs").ReadStream
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on("end", () => {
        controller.close()
      })
      nodeStream.on("error", (err) => {
        controller.error(err)
      })
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}
