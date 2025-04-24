"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TestCase {
  id: string
  title: string
  description: string
  priority: string
  steps: {
    step: number
    action: string
    expected: string
  }[]
}

interface TestExecutorProps {
  testCases: TestCase[]
  url: string
}

interface TestResult {
  testId: string
  status: "pending" | "running" | "passed" | "failed"
  executionTime?: number
  failureReason?: string
  logs?: string[]
}

export default function TestExecutor({ testCases, url }: TestExecutorProps) {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentTestIndex, setCurrentTestIndex] = useState(-1)
  const [logs, setLogs] = useState<string[]>([])

  const executeTest = async (testCase: TestCase, index: number) => {
    setCurrentTestIndex(index)
    setResults((prev) => ({
      ...prev,
      [testCase.id]: { testId: testCase.id, status: "running" },
    }))

    // Add to logs
    const newLog = `[${new Date().toLocaleTimeString()}] Executing test: ${testCase.title}`
    setLogs((prev) => [...prev, newLog])

    try {
      const response = await fetch("/api/test-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: testCase.id,
          platform: "web",
          url: url,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      // Add logs from the response
      if (data.logs) {
        setLogs((prev) => [...prev, ...data.logs])
      }

      setResults((prev) => ({
        ...prev,
        [testCase.id]: {
          testId: testCase.id,
          status: data.status,
          executionTime: data.executionTime,
          failureReason: data.failureReason,
          logs: data.logs,
        },
      }))
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [testCase.id]: {
          testId: testCase.id,
          status: "failed",
          failureReason: error.message || "Unknown error",
        },
      }))
      setLogs((prev) => [...prev, `[ERROR] Test execution failed: ${error.message || "Unknown error"}`])
    }
  }

  const executeAllTests = async () => {
    if (testCases.length === 0) return

    setIsExecuting(true)
    setLogs([`[${new Date().toLocaleTimeString()}] Starting test execution for ${testCases.length} test cases`])

    // Initialize all tests as pending
    const initialResults: Record<string, TestResult> = {}
    testCases.forEach((tc) => {
      initialResults[tc.id] = { testId: tc.id, status: "pending" }
    })
    setResults(initialResults)

    // Execute tests sequentially
    for (let i = 0; i < testCases.length; i++) {
      await executeTest(testCases[i], i)
    }

    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Test execution completed`])
    setIsExecuting(false)
    setCurrentTestIndex(-1)
  }

  const getResultCounts = () => {
    const counts = {
      passed: 0,
      failed: 0,
      pending: 0,
      running: 0,
    }

    Object.values(results).forEach((result) => {
      counts[result.status as keyof typeof counts]++
    })

    return counts
  }

  const resultCounts = getResultCounts()
  const completedTests = resultCounts.passed + resultCounts.failed
  const totalTests = testCases.length
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0

  if (testCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Execution</CardTitle>
          <CardDescription>Generate test cases first to execute them against the website.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <p className="text-muted-foreground">No test cases available for execution.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Execution</CardTitle>
        <CardDescription>Execute generated test cases against the website.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Test Suite</h3>
            <p className="text-sm text-muted-foreground">
              {testCases.length} test cases for {url}
            </p>
          </div>
          <Button onClick={executeAllTests} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute All Tests
              </>
            )}
          </Button>
        </div>

        {isExecuting || Object.keys(results).length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Progress: {completedTests} of {totalTests} completed
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-green-500/10">
                Passed: {resultCounts.passed}
              </Badge>
              <Badge variant="outline" className="bg-red-500/10">
                Failed: {resultCounts.failed}
              </Badge>
              {resultCounts.running > 0 && (
                <Badge variant="outline" className="bg-blue-500/10">
                  Running: {resultCounts.running}
                </Badge>
              )}
              {resultCounts.pending > 0 && (
                <Badge variant="outline" className="bg-gray-500/10">
                  Pending: {resultCounts.pending}
                </Badge>
              )}
            </div>

            <div className="border rounded-md">
              <div className="p-3 border-b bg-muted/50 font-medium">Test Results</div>
              <div className="divide-y">
                {testCases.map((testCase, index) => {
                  const result = results[testCase.id] || { status: "pending" }
                  return (
                    <div
                      key={testCase.id}
                      className={`p-3 flex items-center justify-between ${
                        currentTestIndex === index ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.status === "passed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {result.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
                        {result.status === "running" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                        {result.status === "pending" && <div className="h-5 w-5 rounded-full border border-gray-300" />}
                        <span className="font-medium">{testCase.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.executionTime && (
                          <span className="text-sm text-muted-foreground">{result.executionTime}ms</span>
                        )}
                        <Badge
                          variant={
                            result.status === "passed"
                              ? "success"
                              : result.status === "failed"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border rounded-md">
              <div className="p-3 border-b bg-muted/50 font-medium">Execution Logs</div>
              <ScrollArea className="h-[200px] p-3">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {log}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">No logs available yet.</div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Click "Execute All Tests" to start testing.</div>
        )}
      </CardContent>
    </Card>
  )
}
