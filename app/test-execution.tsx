"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, PlayCircle, StopCircle } from "lucide-react"

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

interface TestExecutionProps {
  testCases: TestCase[]
}

export default function TestExecution({ testCases }: TestExecutionProps) {
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<Record<string, "pending" | "passed" | "failed">>({})

  const toggleTestSelection = (testId: string) => {
    setSelectedTests((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  const selectAll = () => {
    setSelectedTests(testCases.map((test) => test.id))
  }

  const deselectAll = () => {
    setSelectedTests([])
  }

  const executeTests = async () => {
    if (selectedTests.length === 0) {
      alert("Please select at least one test case to execute")
      return
    }

    setIsRunning(true)
    setProgress(0)

    // Initialize all selected tests as pending
    const initialResults: Record<string, "pending" | "passed" | "failed"> = {}
    selectedTests.forEach((id) => {
      initialResults[id] = "pending"
    })
    setResults(initialResults)

    // Simulate test execution with delays
    for (let i = 0; i < selectedTests.length; i++) {
      const testId = selectedTests[i]

      // Update progress
      setProgress(Math.round((i / selectedTests.length) * 100))

      // Simulate API call to execute test
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Randomly determine if test passed or failed (for demo purposes)
      const passed = Math.random() > 0.3

      // Update results
      setResults((prev) => ({
        ...prev,
        [testId]: passed ? "passed" : "failed",
      }))
    }

    setProgress(100)
    setIsRunning(false)
  }

  const stopExecution = () => {
    setIsRunning(false)
  }

  const getStatusBadge = (status: "pending" | "passed" | "failed") => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "passed":
        return <Badge className="bg-green-500">Passed</Badge>
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Execution</CardTitle>
        <CardDescription>Select and execute test cases against your application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <Button variant="outline" size="sm" onClick={selectAll} className="mr-2">
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
          <div>
            {isRunning ? (
              <Button variant="destructive" onClick={stopExecution}>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Execution
              </Button>
            ) : (
              <Button onClick={executeTests}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Execute Tests
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center mt-2">Executing tests: {progress}% complete</p>
          </div>
        )}

        <div className="space-y-4">
          {testCases.map((test) => (
            <div
              key={test.id}
              className={`p-4 border rounded-md ${
                selectedTests.includes(test.id) ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`test-${test.id}`}
                  checked={selectedTests.includes(test.id)}
                  onCheckedChange={() => toggleTestSelection(test.id)}
                  disabled={isRunning}
                />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <label htmlFor={`test-${test.id}`} className="text-sm font-medium leading-none cursor-pointer">
                      {test.title}
                    </label>
                    {results[test.id] && getStatusBadge(results[test.id])}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{test.description}</p>

                  {results[test.id] === "failed" && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Test failed</p>
                        <p className="text-muted-foreground">
                          Expected result not achieved in step 2. Element not found.
                        </p>
                      </div>
                    </div>
                  )}

                  {results[test.id] === "passed" && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Test passed</p>
                        <p className="text-muted-foreground">All steps completed successfully.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
