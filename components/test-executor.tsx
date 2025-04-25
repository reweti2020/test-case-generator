"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, CheckCircle, XCircle, Save, Upload } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  stepResults?: {
    step: number
    description: string
    expected?: string
    passed: boolean
    details: string
  }[]
}

export default function TestExecutor({ testCases, url }: TestExecutorProps) {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentTestIndex, setCurrentTestIndex] = useState(-1)
  const [logs, setLogs] = useState<string[]>([])
  const [savedResults, setSavedResults] = useState<{ date: string, results: Record<string, TestResult>, url: string }[]>([])
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({})

  // Load saved results on component mount
  useEffect(() => {
    const saved = localStorage.getItem('testResults')
    if (saved) {
      try {
        setSavedResults(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved test results', e)
      }
    }
  }, [])

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
          testCase: testCase, // Send the full test case for better execution
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
          stepResults: data.stepResults,
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

  const saveResults = () => {
    if (Object.keys(results).length === 0) return

    const newSavedResults = [
      ...savedResults,
      {
        date: new Date().toISOString(),
        results: { ...results },
        url: url
      }
    ]

    // Save to localStorage
    localStorage.setItem('testResults', JSON.stringify(newSavedResults))
    setSavedResults(newSavedResults)

    // Show notification or feedback
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Test results saved successfully`])
  }

  const exportResults = () => {
    if (Object.keys(results).length === 0) return

    const resultsData = {
      date: new Date().toISOString(),
      url: url,
      results: { ...results },
      testCases: testCases
    }

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Test results exported to file`])
  }

  const importResults = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        if (importedData.results && importedData.testCases) {
          setResults(importedData.results)
          setLogs([
            `[${new Date().toLocaleTimeString()}] Imported test results from ${importedData.date}`,
            `[${new Date().toLocaleTimeString()}] URL: ${importedData.url}`,
            `[${new Date().toLocaleTimeString()}] ${Object.keys(importedData.results).length} test results loaded`
          ])
        } else {
          throw new Error('Invalid test results file format')
        }
      } catch (error: any) {
        setLogs((prev) => [...prev, `[ERROR] Failed to import results: ${error.message}`])
      }
    }
    reader.readAsText(file)
  }

  const toggleTestExpansion = (testId: string) => {
    setExpandedTests(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }))
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
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Test Suite</h3>
            <p className="text-sm text-muted-foreground">
              {testCases.length} test cases for {url}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
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
            
            <Button 
              variant="outline" 
              onClick={saveResults} 
              disabled={Object.keys(results).length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Results
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportResults} 
              disabled={Object.keys(results).length === 0}
            >
              Export Results
            </Button>
            
            <div className="relative">
              <input
                type="file"
                id="import-results"
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
                accept=".json"
                onChange={importResults}
              />
              <Button variant="outline" asChild>
                <label htmlFor="import-results" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Results
                </label>
              </Button>
            </div>
          </div>
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
                  const isExpanded = expandedTests[testCase.id] || false
                  
                  return (
                    <div
                      key={testCase.id}
                      className={`p-3 ${
                        currentTestIndex === index ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleTestExpansion(testCase.id)}>
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
                      
                      {isExpanded && result.stepResults && (
                        <div className="mt-4 pl-7">
                          <h4 className="text-sm font-medium mb-2">Step Results:</h4>
                          <div className="space-y-2">
                            {result.stepResults.map((stepResult, idx) => (
                              <div key={idx} className={`p-2 rounded-md ${stepResult.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <div className="flex justify-between">
                                  <span className="font-medium">Step {stepResult.step}: {stepResult.description}</span>
                                  <Badge variant={stepResult.passed ? "success" : "destructive"}>
                                    {stepResult.passed ? "Passed" : "Failed"}
                                  </Badge>
                                </div>
                                {stepResult.expected && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Expected: {stepResult.expected}
                                  </div>
                                )}
                                <div className="text-sm mt-1">
                                  {stepResult.details}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {isExpanded && result.failureReason && !result.stepResults && (
                        <div className="mt-4 pl-7">
                          <Alert variant="destructive">
                            <AlertDescription>
                              {result.failureReason}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
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
            
            {savedResults.length > 0 && (
              <div className="border rounded-md">
                <div className="p-3 border-b bg-muted/50 font-medium">Saved Test Results</div>
                <Accordion type="single" collapsible className="w-full">
                  {savedResults.map((savedResult, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="px-4">
                        {new Date(savedResult.date).toLocaleString()} - {savedResult.url}
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-green-500/10">
                              Passed: {Object.values(savedResult.results).filter(r => r.status === "passed").length}
                            </Badge>
                            <Badge variant="outline" className="bg-red-500/10">
                              Failed: {Object.values(savedResult.results).filter(r => r.status === "failed").length}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setResults(savedResult.results)
                              setLogs([`[${new Date().toLocaleTimeString()}] Loaded saved test results from ${new Date(savedResult.date).toLocaleString()}`])
                            }}
                          >
                            Load Results
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Click "Execute All Tests" to start testing.</div>
        )}
      </CardContent>
    </Card>
  )
}
