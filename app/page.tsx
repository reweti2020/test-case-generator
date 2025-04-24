"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PlatformSelector from "./platform-selector"
import TestExecution from "./test-execution"
import WorkflowGenerator from "./workflow-generator"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [testCases, setTestCases] = useState([])
  const [activeTab, setActiveTab] = useState("generate")

  const handleGenerateTestCases = async (data: any) => {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Sample test cases for demonstration
      const sampleTestCases = [
        {
          id: "TC_PAGE_1",
          title: "Verify Page Loads Correctly",
          description: "Test that the page loads successfully with the correct title",
          priority: "High",
          steps: [
            {
              step: 1,
              action: `Navigate to ${data.url || data.appId}`,
              expected: "Page loads without errors",
            },
            {
              step: 2,
              action: "Verify page title",
              expected: `Title is "VelocityQA - Software Testing Solutions"`,
            },
          ],
        },
        {
          id: "TC_BTN_1",
          title: "Test Button: Get Started",
          description: "Verify that the Get Started button works as expected",
          priority: "Medium",
          steps: [
            {
              step: 1,
              action: `Navigate to ${data.url || data.appId}`,
              expected: "Page loads successfully",
            },
            {
              step: 2,
              action: "Locate the Get Started button",
              expected: "Button is visible on the page",
            },
            {
              step: 3,
              action: "Click the Get Started button",
              expected: "User is guided to the first step of the process",
            },
          ],
        },
        {
          id: "TC_FORM_1",
          title: "Test Form: Contact Form",
          description: "Verify that the contact form submits correctly",
          priority: "High",
          steps: [
            {
              step: 1,
              action: `Navigate to ${data.url || data.appId}`,
              expected: "Page loads successfully",
            },
            {
              step: 2,
              action: "Locate the contact form",
              expected: "Form is visible on the page",
            },
            {
              step: 3,
              action: "Fill all required fields with valid data",
              expected: "All fields accept input correctly",
            },
            {
              step: 4,
              action: "Submit the form",
              expected: "Form submits successfully and confirmation is shown",
            },
          ],
        },
      ]

      setTestCases(sampleTestCases)

      // Switch to execution tab after generating test cases
      setActiveTab("execute")
    } catch (error) {
      console.error("Error generating test cases:", error)
      alert("Failed to generate test cases. Please try again.")
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

        <TabsContent value="workflow" className="mt-6">
          <WorkflowGenerator />
        </TabsContent>
      </Tabs>
    </main>
  )
}
