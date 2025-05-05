"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, Code, FileText, TestTube2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export default function TestResults() {
  const params = useParams()
  const { id } = params
  const [activeTab, setActiveTab] = useState("results")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, you would fetch this from an API
    // For now, we'll get it from localStorage
    const storedResult = localStorage.getItem(`test-${id}`)
    if (storedResult) {
      setTestResult(JSON.parse(storedResult))
    }
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <TestTube2 className="h-6 w-6" />
                <span className="font-bold">TestAI</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64 md:col-span-2" />
            </div>
            <div className="mt-6">
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!testResult) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <TestTube2 className="h-6 w-6" />
                <span className="font-bold">TestAI</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-bold">Test Result Not Found</h2>
              <p className="text-muted-foreground">The test result you're looking for doesn't exist or has expired.</p>
              <Button asChild>
                <Link href="/create">Create New Test</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <TestTube2 className="h-6 w-6" />
              <span className="font-bold">TestAI</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
              <Link
                href="/create"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Create Test
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tighter">Test Results</h1>
            </div>
            <Button asChild>
              <Link href="/create">Run New Test</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
                <CardDescription>Overview of test execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">URL:</span>
                    <span className="text-sm">{testResult.url}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm flex items-center">
                      <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                      {testResult.date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm flex items-center">
                      <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                      {testResult.duration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={testResult.status === "passed" ? "success" : "destructive"}>
                      {testResult.status === "passed" ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pass Rate:</span>
                      <span className="text-sm">{testResult.passRate}%</span>
                    </div>
                    <Progress value={testResult.passRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Test Statistics</CardTitle>
                <CardDescription>Breakdown of test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                    <span className="text-2xl font-bold">{testResult.summary.total}</span>
                    <span className="text-sm text-muted-foreground">Total Tests</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 bg-green-50 dark:bg-green-950">
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {testResult.summary.passed}
                    </span>
                    <span className="text-sm text-muted-foreground">Passed</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4 bg-red-50 dark:bg-red-950">
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {testResult.summary.failed}
                    </span>
                    <span className="text-sm text-muted-foreground">Failed</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                    <span className="text-2xl font-bold text-muted-foreground">{testResult.summary.skipped}</span>
                    <span className="text-sm text-muted-foreground">Skipped</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="results">Test Results</TabsTrigger>
                <TabsTrigger value="plan">Test Plan</TabsTrigger>
                <TabsTrigger value="code">Test Code</TabsTrigger>
              </TabsList>
              <TabsContent value="results" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Results</CardTitle>
                    <CardDescription>Individual test case results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {testResult.results.map((result: any) => (
                        <div key={result.id} className="flex flex-col space-y-2 rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {result.status === "passed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              <span className="font-medium">{result.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{result.duration}</span>
                          </div>
                          {result.error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                              {result.error}
                            </div>
                          )}
                          {result.screenshot && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Screenshot:</p>
                              <div className="relative h-48 w-full overflow-hidden rounded border">
                                <img
                                  src={result.screenshot || "/placeholder.svg"}
                                  alt={`Screenshot for ${result.name}`}
                                  className="object-contain w-full h-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="plan" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Test Plan
                    </CardTitle>
                    <CardDescription>AI-generated test plan for {testResult.url}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <pre className="whitespace-pre-wrap text-sm">{testResult.testPlan}</pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="code" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Test Code
                    </CardTitle>
                    <CardDescription>AI-generated test code for {testResult.url}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{testResult.testCode}</pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
