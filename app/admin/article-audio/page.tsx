"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Music,
  Upload,
  Loader2,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
  Library,
  FolderOpen,
  Pause,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useGetJournals } from "@/src/features/journals/api/use-get-journals"
import { useUploadArticleAudio } from "@/src/features/article-audio/api/use-upload-article-audio"
import { useArticleAudioList } from "@/src/features/article-audio/api/use-article-audio-list"
import { useDeleteArticleAudio } from "@/src/features/article-audio/api/use-delete-article-audio"
import { ALLOWED_AUDIO_MIME_TYPES } from "@/src/features/article-audio/schemas/article-audio-schema"
import type { ArticleAudioRecord } from "@/src/features/article-audio/types/article-audio-types"

import { useQuery } from "@tanstack/react-query"
import type { CurrentIssue, CurrentIssueArticle } from "@/src/features/journals/types/current-issue-types"
import type { ArchiveIssue } from "@/src/features/journals/types/archive-issue-types"

const LOCALE_OPTIONS = [
  { value: "__default__", label: "Default (unilingual)" },
  { value: "en_US", label: "English (en_US)" },
  { value: "ar_SA", label: "Arabic (ar_SA)" },
  { value: "fr_FR", label: "French (fr_FR)" },
  { value: "es_ES", label: "Spanish (es_ES)" },
]

const ACCEPT_LIST = ALLOWED_AUDIO_MIME_TYPES.join(",")

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatIssueLabel(issue: ArchiveIssue | CurrentIssue): string {
  const parts: string[] = []
  if ("showVolume" in issue && issue.showVolume && issue.volume != null) parts.push(`Vol ${issue.volume}`)
  if ("showNumber" in issue && issue.showNumber && issue.number != null) parts.push(`No ${issue.number}`)
  if ("showYear" in issue && issue.showYear && issue.year != null) parts.push(`(${issue.year})`)
  if (parts.length === 0 && issue.title) return issue.title
  const label = parts.join(", ")
  return issue.title ? `${label} — ${issue.title}` : label
}

function firstAuthorLabel(authors: CurrentIssueArticle["authors"]): string {
  if (!authors || authors.length === 0) return ""
  const a = authors[0]
  const name = [a.givenName, a.familyName].filter(Boolean).join(" ")
  return authors.length > 1 ? `${name} et al.` : name
}

// ─── Browse Tab ──────────────────────────────────────────────────────────────

function BrowseTab() {
  const { data: journals, isLoading: journalsLoading } = useGetJournals()
  const { data: audios } = useArticleAudioList()
  const upload = useUploadArticleAudio()
  const deleteMut = useDeleteArticleAudio()

  const [selectedOjsId, setSelectedOjsId] = useState("")
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<CurrentIssueArticle | null>(null)
  const [locale, setLocale] = useState("__default__")
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const eligibleJournals = useMemo(
    () => (journals ?? []).filter((j) => Boolean(j.ojs_id)),
    [journals]
  )

  const { data: currentIssue, isLoading: currentIssueLoading } = useQuery<CurrentIssue | null>({
    queryKey: ["journals", selectedOjsId, "current-issue"],
    queryFn: async () => {
      const res = await fetch(`/api/journals/${selectedOjsId}/current-issue`)
      if (!res.ok) throw new Error(`Failed to fetch current issue (HTTP ${res.status})`)
      const json = await res.json()
      return json.data ?? null
    },
    enabled: !!selectedOjsId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: archiveIssues, isLoading: archiveLoading } = useQuery<ArchiveIssue[]>({
    queryKey: ["journals", selectedOjsId, "archive"],
    queryFn: async () => {
      const res = await fetch(`/api/journals/${selectedOjsId}/archive`)
      if (!res.ok) throw new Error(`Failed to fetch archive issues (HTTP ${res.status})`)
      const json = await res.json()
      return json.data ?? []
    },
    enabled: !!selectedOjsId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: issueArticles, isLoading: issueArticlesLoading } = useQuery<CurrentIssue | null>({
    queryKey: ["journals", selectedOjsId, "issues", selectedIssueId],
    queryFn: async () => {
      const res = await fetch(`/api/journals/${selectedOjsId}/issues/${selectedIssueId}`)
      if (!res.ok) throw new Error(`Failed to fetch issue articles (HTTP ${res.status})`)
      const json = await res.json()
      return json.data ?? null
    },
    enabled: !!selectedOjsId && selectedIssueId !== null && selectedIssueId !== currentIssue?.issueId,
    staleTime: 5 * 60 * 1000,
  })

  const displayedArticles: CurrentIssueArticle[] = useMemo(() => {
    if (selectedIssueId === null) return []
    if (currentIssue && selectedIssueId === currentIssue.issueId) return currentIssue.articles
    return issueArticles?.articles ?? []
  }, [selectedIssueId, currentIssue, issueArticles])

  const audioForArticle = useMemo(() => {
    if (!selectedArticle || !audios) return null
    return audios.find(
      (a) =>
        a.ojs_journal_id === selectedOjsId &&
        a.submission_id === String(selectedArticle.submissionId)
    ) ?? null
  }, [selectedArticle, audios, selectedOjsId])

  const handleJournalChange = (ojsId: string) => {
    setSelectedOjsId(ojsId)
    setSelectedIssueId(null)
    setSelectedArticle(null)
    setFile(null)
    setStatusMessage(null)
    setErrorMessage(null)
  }

  const handleIssueClick = (issueId: number) => {
    setSelectedIssueId(issueId === selectedIssueId ? null : issueId)
    setSelectedArticle(null)
    setFile(null)
    setStatusMessage(null)
    setErrorMessage(null)
  }

  const handleArticleClick = (article: CurrentIssueArticle) => {
    setSelectedArticle(article.submissionId === selectedArticle?.submissionId ? null : article)
    setFile(null)
    setStatusMessage(null)
    setErrorMessage(null)
  }

  const handleUpload = async () => {
    if (!file || !selectedArticle) return
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await upload.mutateAsync({
        file,
        ojsJournalId: selectedOjsId,
        submissionId: String(selectedArticle.submissionId),
        locale: locale === "__default__" ? "" : locale,
      })
      setStatusMessage("Audio uploaded successfully.")
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      setStatusMessage("Audio deleted.")
      setDeleteTarget(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed")
      setDeleteTarget(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const issuesLoading = currentIssueLoading || archiveLoading

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar — Journal + Issues */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Journal</CardTitle>
            </CardHeader>
            <CardContent>
              {journalsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Select value={selectedOjsId} onValueChange={handleJournalChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a journal" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleJournals.map((j) => (
                      <SelectItem key={String(j.id)} value={j.ojs_id ?? ""}>
                        {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {selectedOjsId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Issues</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {issuesLoading ? (
                  <p className="text-sm text-muted-foreground px-4 pb-4">Loading issues…</p>
                ) : (
                  <div className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
                    {currentIssue && (
                      <button
                        type="button"
                        onClick={() => handleIssueClick(currentIssue.issueId)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2 ${
                          selectedIssueId === currentIssue.issueId ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {selectedIssueId === currentIssue.issueId ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {formatIssueLabel(currentIssue)}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          Current
                        </Badge>
                      </button>
                    )}
                    {(archiveIssues ?? []).map((issue) => (
                      <button
                        key={issue.issueId}
                        type="button"
                        onClick={() => handleIssueClick(issue.issueId)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2 ${
                          selectedIssueId === issue.issueId ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {selectedIssueId === issue.issueId ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="truncate">{formatIssueLabel(issue)}</span>
                        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                          {issue.articleCount}
                        </span>
                      </button>
                    ))}
                    {!currentIssue && (archiveIssues ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground px-4 py-3">No published issues.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — Article list + Manage panel */}
        <div className="space-y-4">
          {!selectedOjsId ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Select a journal to browse articles</p>
              </CardContent>
            </Card>
          ) : selectedIssueId === null ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-muted-foreground">Select an issue from the sidebar.</p>
              </CardContent>
            </Card>
          ) : issueArticlesLoading && selectedIssueId !== currentIssue?.issueId ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading articles…</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Articles ({displayedArticles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {displayedArticles.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 pb-4">No articles in this issue.</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {displayedArticles.map((article) => (
                        <button
                          key={article.submissionId}
                          type="button"
                          onClick={() => handleArticleClick(article)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 ${
                            selectedArticle?.submissionId === article.submissionId ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-snug truncate">
                                {article.title || "Untitled"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {firstAuthorLabel(article.authors)}
                                {article.submissionId ? ` · Sub #${article.submissionId}` : ""}
                              </p>
                            </div>
                            {article.audioUrl ? (
                              <Badge variant="default" className="shrink-0 text-[10px]">Has audio</Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-[10px]">No audio</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manage panel for selected article */}
              {selectedArticle && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base truncate">
                      {selectedArticle.title || "Untitled"} — Sub #{selectedArticle.submissionId}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {audioForArticle ? (
                      <ExistingAudioPanel
                        audio={audioForArticle}
                        onReplace={() => {
                          setFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        onDelete={() =>
                          setDeleteTarget({
                            id: audioForArticle.id,
                            title: selectedArticle.title || "Untitled",
                          })
                        }
                      />
                    ) : null}

                    <div className="space-y-3">
                      <Label>{audioForArticle ? "Replace audio" : "Upload audio"}</Label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        {file ? (
                          <p className="text-sm font-medium">{file.name} ({formatBytes(file.size)})</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Drag & drop audio file here</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          MP3, M4A, WAV, OGG · Max size enforced server-side
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPT_LIST}
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </div>

                      <div className="flex items-end gap-3">
                        <div className="space-y-1.5 flex-1">
                          <Label htmlFor="browse-locale">Locale</Label>
                          <Select value={locale} onValueChange={setLocale}>
                            <SelectTrigger id="browse-locale">
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
                        <Button
                          onClick={handleUpload}
                          disabled={!file || upload.isPending}
                          className="gap-2"
                        >
                          {upload.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {upload.isPending ? "Uploading…" : audioForArticle ? "Replace" : "Upload"}
                        </Button>
                      </div>

                      {upload.isPending && (
                        <UploadProgressBar progress={upload.progress} />
                      )}
                    </div>

                    {errorMessage && (
                      <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
                    )}
                    {statusMessage && !errorMessage && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                        {statusMessage}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual fallback — collapsed */}
      <ManualEntryFallback />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.title ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMut.isPending}
      />
    </>
  )
}

// ─── Audio Library Tab ───────────────────────────────────────────────────────

function AudioLibraryTab() {
  const { data: audios, isLoading, isError } = useArticleAudioList()
  const deleteMut = useDeleteArticleAudio()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      setDeleteTarget(null)
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audio library…</p>
  if (isError) return <p className="text-sm text-destructive">Failed to load audio library.</p>
  if (!audios || audios.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Music className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No audio uploaded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Use the Browse tab to attach audio to articles.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2.5 font-medium">Article</th>
                  <th className="px-4 py-2.5 font-medium">Journal</th>
                  <th className="px-4 py-2.5 font-medium">Locale</th>
                  <th className="px-4 py-2.5 font-medium">File</th>
                  <th className="px-4 py-2.5 font-medium">Uploaded</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {audios.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 max-w-[280px]">
                      <p className="truncate font-medium">
                        {row.article_title || `Submission #${row.submission_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.journal_title || row.ojs_journal_id}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.locale || "Default"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {row.original_filename} ({formatBytes(Number(row.size_bytes))})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs tabular-nums">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <AudioPlayButton url={row.audio_url ?? null} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label="Delete audio"
                          onClick={() =>
                            setDeleteTarget({
                              id: row.id,
                              title: row.article_title || `Submission #${row.submission_id}`,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.title ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMut.isPending}
      />
    </>
  )
}

// ─── Shared Components ───────────────────────────────────────────────────────

function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Uploading…</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function AudioPlayButton({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
    const onEnded = () => setPlaying(false)
    audio.addEventListener("ended", onEnded)
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
    }
  }, [url])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={!url}
      onClick={toggle}
      aria-label={playing ? "Pause audio" : "Play audio"}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
    </Button>
  )
}

function ExistingAudioPanel({
  audio,
  onReplace: _onReplace,
  onDelete,
}: {
  audio: ArticleAudioRecord
  onReplace: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <AudioPlayButton url={audio.audio_url ?? null} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{audio.original_filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(Number(audio.size_bytes))} · {audio.locale || "Default"} · Uploaded{" "}
          {formatDate(audio.created_at)}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} aria-label="Delete audio">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function DeleteConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete audio?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the audio file for &quot;{title}&quot;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ManualEntryFallback() {
  const [open, setOpen] = useState(false)
  const { data: journals } = useGetJournals()
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage(null)
    setErrorMessage(null)
    if (!articleSelected || !file) return

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
      const fileInput = event.currentTarget.elements.namedItem("manual-audio-file")
      if (fileInput instanceof HTMLInputElement) fileInput.value = ""
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CardTitle className="text-base">Manual entry (by submission ID)</CardTitle>
        </button>
        {!open && (
          <p className="text-xs text-muted-foreground ml-6">
            For articles not in a published issue.
          </p>
        )}
      </CardHeader>
      {open && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="manual-journal">Journal</Label>
              <Select value={journalId} onValueChange={setJournalId}>
                <SelectTrigger id="manual-journal">
                  <SelectValue placeholder="Select a journal" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleJournals.map((j) => (
                    <SelectItem key={String(j.id)} value={j.ojs_id ?? ""}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-sub-id">OJS Submission ID</Label>
              <Input
                id="manual-sub-id"
                inputMode="numeric"
                pattern="[1-9]\d*"
                placeholder="e.g. 412"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value.trim())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-locale">Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="manual-locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-audio-file">Audio file</Label>
              <Input
                id="manual-audio-file"
                name="manual-audio-file"
                type="file"
                accept={ACCEPT_LIST}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">MP3, M4A, WAV, or OGG.</p>
            </div>
            {errorMessage && <p className="text-sm text-destructive" role="alert">{errorMessage}</p>}
            {statusMessage && !errorMessage && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{statusMessage}</p>
            )}
            <Button type="submit" disabled={!articleSelected || !file || upload.isPending} className="gap-2">
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {upload.isPending ? "Uploading…" : "Upload"}
            </Button>
            {upload.isPending && (
              <UploadProgressBar progress={upload.progress} />
            )}
          </form>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Page Root ───────────────────────────────────────────────────────────────

export default function ArticleAudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Article Audio</h1>
        <p className="text-muted-foreground mt-1">
          Browse articles by journal and issue, attach audio, or manage existing uploads.
        </p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Browse Articles
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <Library className="h-3.5 w-3.5" />
            Audio Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          <BrowseTab />
        </TabsContent>

        <TabsContent value="library" className="space-y-4 mt-4">
          <AudioLibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
