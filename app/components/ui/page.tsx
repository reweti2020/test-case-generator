"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PlatformSelector from "./platform-selector"
import TestExecution from "./test-execution"
import WorkflowGenerator from "./workflow-generator"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [testCases, setTestCases] = useState([])
  const [activeTab, setActiveTab] = useState("generate")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pageData, setPageData] = useState<any>(null)
  const [processed, setProcessed] = useState<any>(null)
  const [nextElementType, setNextElementType] = useState<string | null>(null)
  const [nextElementIndex, setNextElementIndex] = useState<number>(0)
  const [hasMoreElements, setHasMoreElements] = useState<boolean>(false)

  const handleGenerateTestCases = async (data: any) => {
    setIsLoading(true)

    try {
      // Call the real API endpoint
      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: data.url || data.appId,
          mode: "first",
          platform: data.platform,
          appId: data.appId,
          appPlatform: data.appPlatform,
          appVersion: data.appVersion,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Store session data in state for future use
        setSessionId(result.sessionId)
        setPageData(result.pageData)
        setProcessed(result.processed)
        setNextElementType(result.nextElementType)
        setNextElementIndex(result.nextElementIndex)
        setHasMoreElements(result.hasMoreElements)

        // Set the test cases
        setTestCases(result.testCases || [])

        // Switch to execution tab after generating test cases
        setActiveTab("execute")
      } else {
        console.error("API error:", result.error)
        alert(`Failed to generate test cases: ${result.error}`)
      }
    } catch (error) {
      console.error("Error generating test cases:", error)
      alert("Failed to generate test cases. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateMoreTests = async () => {
    if (!sessionId || !hasMoreElements) {
      alert("No more elements to test or missing session ID")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "next",
          sessionId: sessionId,
          elementType: nextElementType,
          elementIndex: nextElementIndex,
          batchSize: 5, // Request 5 tests at once
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Update state with received data
        setPageData(result.pageData || pageData)
        setProcessed(result.processed || processed)
        setNextElementType(result.nextElementType)
        setNextElementIndex(result.nextElementIndex)
        setHasMoreElements(result.hasMoreElements)

        // Add new test cases to existing ones
        setTestCases((prevTestCases) => [...prevTestCases, ...(result.testCases || [])])
      } else {
        console.error("API error:", result.error)
        alert(`Failed to generate more test cases: ${result.error}`)
      }
    } catch (error) {
      console.error("Error generating more test cases:", error)
      alert("Failed to generate more test cases. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">VelocityQA Test Suite</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Tests</TabsTrigger>
          <TabsTrigger value="execute" disabled={testCases.length === 0}>
            Execute Tests
          </TabsTrigger>
          <TabsTrigger value="workflow">Workflow Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <PlatformSelector onSubmit={handleGenerateTestCases} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="execute" className="mt-6">
          <TestExecution testCases={testCases} />
        </TabsContent>

        {hasMoreElements && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleGenerateMoreTests}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? "Generating..." : "Generate 5 More Tests"}
            </Button>
          </div>
        )}

        <TabsContent value="workflow" className="mt-6">
          <WorkflowGenerator />
        </TabsContent>
      </Tabs>
    </main>
  )
}

