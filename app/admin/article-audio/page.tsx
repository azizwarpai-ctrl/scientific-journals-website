"use client"

import { useMemo, useState } from "react"
import { Music, Upload, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetJournals } from "@/src/features/journals/api/use-get-journals"
import { useUploadArticleAudio } from "@/src/features/article-audio/api/use-upload-article-audio"
import { useArticleAudioList } from "@/src/features/article-audio/api/use-article-audio-list"
import { ALLOWED_AUDIO_MIME_TYPES } from "@/src/features/article-audio/schemas/article-audio-schema"

const LOCALE_OPTIONS = [
  { value: "__default__", label: "Default (unilingual)" },
  { value: "en_US", label: "English (en_US)" },
  { value: "ar_SA", label: "Arabic (ar_SA)" },
  { value: "fr_FR", label: "French (fr_FR)" },
  { value: "es_ES", label: "Spanish (es_ES)" },
]

const ACCEPT_LIST = ALLOWED_AUDIO_MIME_TYPES.join(",")

export default function ArticleAudioPage() {
  const { data: journals, isLoading: journalsLoading, isError: journalsError } = useGetJournals()
  const { data: audios, isLoading: audiosLoading } = useArticleAudioList()
  const upload = useUploadArticleAudio()

  const [journalId, setJournalId] = useState("")
  const [submissionId, setSubmissionId] = useState("")
  const [locale, setLocale] = useState("__default__")
  const [file, setFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const eligibleJournals = useMemo(
    () => (journals ?? []).filter((j) => Boolean(j.ojs_id)),
    [journals]
  )

  const articleSelected = journalId.length > 0 && /^[1-9]\d*$/.test(submissionId)
  const canSubmit = articleSelected && file !== null && !upload.isPending

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage(null)
    setErrorMessage(null)
    if (!canSubmit || !file) return

    try {
      const saved = await upload.mutateAsync({
        file,
        ojsJournalId: journalId,
        submissionId,
        locale: locale === "__default__" ? "" : locale,
      })
      setStatusMessage(
        `Saved audio for submission #${saved.submission_id} (locale "${saved.locale || "default"}").`
      )
      setFile(null)
      // Reset the file input so the same filename can be re-picked.
      const fileInput = event.currentTarget.elements.namedItem("audio-file")
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = ""
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Article Audio</h1>
        <p className="text-muted-foreground mt-1">
          Attach an audio abstract to an existing OJS article. One file per article and locale; re-uploading replaces the previous file.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — Picker */}
        <Card>
          <CardHeader>
            <CardTitle>Pick an article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="journal-select">Journal</Label>
              {journalsLoading ? (
                <p className="text-sm text-muted-foreground">Loading journals…</p>
              ) : journalsError ? (
                <p className="text-sm text-destructive">Failed to load journals.</p>
              ) : (
                <Select
                  value={journalId}
                  onValueChange={setJournalId}
                >
                  <SelectTrigger id="journal-select">
                    <SelectValue placeholder="Select a journal" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleJournals.map((j) => (
                      <SelectItem key={String(j.id)} value={j.ojs_id ?? ""}>
                        {j.title} {j.ojs_path ? `(${j.ojs_path})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Only journals synced from OJS appear here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission-id">OJS submission ID</Label>
              <Input
                id="submission-id"
                inputMode="numeric"
                pattern="[1-9]\d*"
                placeholder="e.g. 412"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value.trim())}
              />
              <p className="text-xs text-muted-foreground">
                The numeric OJS submission_id, not the publication_id used in the public URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale-select">Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="locale-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Uploader OR empty state */}
        <Card>
          <CardHeader>
            <CardTitle>Upload audio</CardTitle>
          </CardHeader>
          <CardContent>
            {articleSelected ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-file">Audio file</Label>
                  <Input
                    id="audio-file"
                    name="audio-file"
                    type="file"
                    accept={ACCEPT_LIST}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    MP3, M4A, WAV, or OGG. Max file size set by MAX_FILE_SIZE_MB.
                  </p>
                </div>

                {errorMessage && (
                  <p className="text-sm text-destructive" role="alert">
                    {errorMessage}
                  </p>
                )}
                {statusMessage && !errorMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                    {statusMessage}
                  </p>
                )}

                <Button type="submit" disabled={!canSubmit} className="w-full gap-2">
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {upload.isPending ? "Uploading…" : "Upload audio"}
                </Button>
              </form>
            ) : (
              <UploaderEmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Existing audio list — small, helps the manager confirm the upload landed */}
      <Card>
        <CardHeader>
          <CardTitle>Existing audio</CardTitle>
        </CardHeader>
        <CardContent>
          {audiosLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !audios || audios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audio uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {audios.map((row) => (
                <li key={row.id} className="flex items-center justify-between py-2 gap-4">
                  <span className="font-mono text-xs truncate">
                    journal={row.ojs_journal_id} · submission={row.submission_id} · locale=
                    {row.locale || "default"}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.original_filename}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function UploaderEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <Music className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Select an article to attach audio</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        Choose a journal and enter the OJS submission ID on the left.
      </p>
    </div>
  )
}
