"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import TestCaseList from "../components/test-case-list"
import TestExecutor from "../components/test-executor"
import { Loader2 } from "lucide-react"

export default function TestCaseGenerator() {
  const [url, setUrl] = useState("")
  const [format, setFormat] = useState("json")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [testCases, setTestCases] = useState<any[]>([])
  const [hasMoreElements, setHasMoreElements] = useState(false)
  const [nextElementType, setNextElementType] = useState<string | null>(null)
  const [nextElementIndex, setNextElementIndex] = useState(0)
  const [totalTestCases, setTotalTestCases] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) {
      setError("Please enter a valid URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setTestCases([])
    setSessionId(null)

    try {
      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          mode: "first",
          format,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSessionId(data.sessionId)
        setTestCases(data.testCases || [])
        setHasMoreElements(data.hasMoreElements)
        setNextElementType(data.nextElementType)
        setNextElementIndex(data.nextElementIndex)
        setTotalTestCases(data.totalTestCases || (data.testCases ? data.testCases.length : 0))
      } else {
        setError(`Error: ${data.error || "Unknown error occurred"}`)
      }
    } catch (error: any) {
      setError(`Error: ${error.message || "Unknown error occurred"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateMore = async () => {
    if (!sessionId || !hasMoreElements) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "next",
          sessionId,
          elementType: nextElementType,
          elementIndex: nextElementIndex,
          format,
          batchSize: 5,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setTestCases((prev) => [...prev, ...(data.testCases || [])])
        setHasMoreElements(data.hasMoreElements)
        setNextElementType(data.nextElementType)
        setNextElementIndex(data.nextElementIndex)
        setTotalTestCases(data.totalTestCases || testCases.length + (data.testCases?.length || 0))
      } else {
        setError(`Error: ${data.error || "Unknown error occurred"}`)
      }
    } catch (error: any) {
      setError(`Error: ${error.message || "Unknown error occurred"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: string) => {
    if (!sessionId) return

    try {
      const response = await fetch("/api/export-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          format,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Create a blob and download the file
        const blob = new Blob([data.exportData], { type: data.contentType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        setError(`Export error: ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      setError(`Export error: ${error.message || "Unknown error"}`)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col items-center mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">Test Case Generator</h1>
        <p className="text-muted-foreground max-w-2xl">
          Generate test cases by analyzing website elements. Enter a URL to get started.
        </p>
      </div>

      <Tabs defaultValue="generate" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Test Cases</TabsTrigger>
          <TabsTrigger value="execute">Execute Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Website Analysis</CardTitle>
              <CardDescription>
                Enter a URL to analyze and generate test cases based on the website's elements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="url">Website URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger id="format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="txt">Plain Text</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="maestro">Maestro</SelectItem>
                        <SelectItem value="katalon">Katalon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Generate Test Cases"
                    )}
                  </Button>
                </div>
              </form>

              {error && <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">{error}</div>}

              {hasMoreElements && testCases.length > 0 && (
                <div className="mt-6 p-4 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {nextElementType &&
                          `Next: ${nextElementType.charAt(0).toUpperCase() + nextElementType.slice(1)} #${nextElementIndex + 1}`}
                      </p>
                      <div className="w-full h-2 bg-muted rounded-full mt-2">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${(testCases.length / (testCases.length + 10)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <Button onClick={handleGenerateMore} disabled={isLoading} variant="outline">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate 5 More"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>

            {testCases.length > 0 && (
              <CardFooter className="flex flex-col">
                <div className="w-full mb-4">
                  <h3 className="text-lg font-medium mb-2">Export Options</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleExport("json")}>
                      JSON
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("txt")}>
                      Text
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("html")}>
                      HTML
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>
                      CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("maestro")}>
                      Maestro
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("katalon")}>
                      Katalon
                    </Button>
                  </div>
                </div>

                <TestCaseList testCases={testCases} />
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="execute">
          <TestExecutor testCases={testCases} url={url} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

