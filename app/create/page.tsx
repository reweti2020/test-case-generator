"use client"

import type React from "react"
import type { ScrapingResult } from "@/lib/scraper"
import type { GeneratedTests } from "@/lib/test-generator"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TestTube2 } from "lucide-react"
import { TestProgress } from "@/components/test-progress"
import { toast } from "@/components/ui/use-toast"

export default function CreateTest() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [testId, setTestId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) return

    setIsLoading(true)
    setCurrentStep(1)
    setError(null)

    try {
      // Step 1: Scrape the website
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json()
        throw new Error(errorData.error || "Failed to scrape website")
      }

      const scrapeData = await scrapeResponse.json()
      const scrapingResult: ScrapingResult = scrapeData.data

      // Step 2: Generate tests
      setCurrentStep(2)
      const generateResponse = await fetch("/api/generate-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scrapingResult }),
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        throw new Error(errorData.error || "Failed to generate tests")
      }

      const generateData = await generateResponse.json()
      const generatedTests: GeneratedTests = generateData.data

      // Step 3: Execute tests
      setCurrentStep(3)
      const executeResponse = await fetch("/api/execute-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          testCases: generatedTests.testCases,
          testCode: generatedTests.testCode,
          testPlan: generatedTests.testPlan,
        }),
      })

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json()
        throw new Error(errorData.error || "Failed to execute tests")
      }

      const executeData = await executeResponse.json()
      const testResults = executeData.data

      // Save test results to localStorage for now
      // In a real app, you would save this to a database
      const testId = testResults.id
      localStorage.setItem(`test-${testId}`, JSON.stringify(testResults))

      // Navigate to results page
      router.push(`/results/${testId}`)
    } catch (error) {
      console.error("Error during test process:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
              <Link href="/create" className="text-sm font-medium transition-colors hover:text-primary">
                Create Test
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 py-12">
        <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Create a New Test</h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Enter the URL of the website you want to test. Our AI will analyze the site, generate test cases, and
              execute them automatically.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Website URL</CardTitle>
                <CardDescription>Enter the URL of the website you want to test</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => router.push("/")} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!url || isLoading}>
                  Start Testing
                </Button>
              </CardFooter>
            </Card>
            {isLoading && <TestProgress currentStep={currentStep} />}
            {error && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                <CardContent className="pt-6">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
