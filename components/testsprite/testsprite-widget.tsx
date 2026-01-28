"use client"

import { useState } from "react"
import { Bug, Play, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    scanPage,
    generateMockData,
    simulateInteraction,
    type ScanResult,
} from "@/lib/testsprite-core"

export function TestspriteWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [isRunning, setIsRunning] = useState(false)

    const addLog = (msg: string) => {
        setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
    }

    const handleAutoFill = async (isFuzz = false) => {
        setIsRunning(true)
        addLog(isFuzz ? "Starting Fuzz Test..." : "Starting Auto-Fill...")

        try {
            const { inputs, selects, textareas } = scanPage()
            const elements = [...inputs, ...selects, ...textareas]

            if (elements.length === 0) {
                addLog("No interactive elements found.")
                setIsRunning(false)
                return
            }

            addLog(`Found ${elements.length} elements.`)

            for (const el of elements) {
                const name = el.name || el.id || el.type
                const value = generateMockData(el.type, name, isFuzz)

                // Skip hidden fields or specific types if needed
                if (el.type === "hidden" || el.type === "file") continue

                addLog(`Filling ${name} (${el.type}) with "${value.substring(0, 20)}..."`)
                await simulateInteraction(el, value)
            }

            addLog("Auto-fill complete.")
        } catch (error) {
            addLog(`Error: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setIsRunning(false)
        }
    }

    const handleSubmission = async () => {
        addLog("Attempting submission...")
        const { buttons } = scanPage()

        const submitBtn = buttons.find(
            b => b.type === "submit" ||
                b.innerText.toLowerCase().includes("save") ||
                b.innerText.toLowerCase().includes("submit") ||
                b.innerText.toLowerCase().includes("login")
        )

        if (submitBtn) {
            addLog(`Clicking button: ${submitBtn.innerText}`)
            submitBtn.click()
        } else {
            addLog("No submit button found.")
        }
    }

    if (!isOpen) {
        return (
            <Button
                className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
                onClick={() => setIsOpen(true)}
            >
                <Bug className="h-6 w-6" />
            </Button>
        )
    }

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl animate-in slide-in-from-bottom-5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bug className="h-4 w-4" /> Testsprite
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoFill(false)}
                        disabled={isRunning}
                    >
                        <Play className="mr-2 h-3 w-3" /> Auto-Fill
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoFill(true)}
                        disabled={isRunning}
                    >
                        <RefreshCw className="mr-2 h-3 w-3" /> Fuzz Test
                    </Button>
                    <Button
                        className="col-span-2"
                        size="sm"
                        onClick={handleSubmission}
                        disabled={isRunning}
                    >
                        Submit Form
                    </Button>
                </div>

                <div className="bg-muted rounded-md p-2">
                    <div className="text-xs font-semibold mb-1 text-muted-foreground">Logs</div>
                    <div className="h-32 w-full rounded border bg-background p-2 overflow-y-auto">
                        {logs.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Ready to test...</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-xs font-mono mb-1 last:mb-0">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
