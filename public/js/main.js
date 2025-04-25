"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Upload, Save } from 'lucide-react'

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load saved test cases on component mount
  useEffect(() => {
    const savedTestCases = localStorage.getItem('savedTestCases')
    if (savedTestCases) {
      try {
        const parsed = JSON.parse(savedTestCases)
        if (parsed.length > 0) {
          setSuccessMessage("Previously saved test cases are available. Click 'Load Saved Tests' to view them.")
        }
      } catch (e) {
        console.error('Failed to parse saved test cases', e)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) {
      setError("Please enter a valid URL")
      return
    }

    // Ensure URL has protocol
    let processedUrl = url
    if (!/^https?:\/\//i.test(url)) {
      processedUrl = "https://" + url
    }

    setIsLoading(true)
    setError(null)
    setTestCases([])
    setSessionId(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/generate-incremental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: processedUrl,
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
        setSuccessMessage("Test cases generated successfully!")
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
    setError(null)
    setSuccessMessage(null)

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
        setSuccessMessage("Additional test cases generated successfully!")
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
        setSuccessMessage(`Test cases exported as ${format.toUpperCase()} successfully!`)
      } else {
        setError(`Export error: ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      setError(`Export error: ${error.message || "Unknown error"}`)
    }
  }

  const saveTestCases = () => {
    if (testCases.length === 0) return
    
    const testSuite = {
      url,
      sessionId,
      testCases,
      date: new Date().toISOString()
    }
    
    // Get existing saved test suites
    const savedTestCases = localStorage.getItem('savedTestCases')
    let testSuites = []
    
    if (savedTestCases) {
      try {
        testSuites = JSON.parse(savedTestCases)
      } catch (e) {
        console.error('Failed to parse saved test cases', e)
      }
    }
    
    // Add new test suite
    testSuites.push(testSuite)
    
    // Save back to localStorage
    localStorage.setItem('savedTestCases', JSON.stringify(testSuites))
    setSuccessMessage("Test cases saved successfully!")
  }
  
  const loadSavedTestCases = () => {
    const savedTestCases = localStorage.getItem('savedTestCases')
    if (!savedTestCases) {
      setError("No saved test cases found")
      return
    }
    
    try {
      const testSuites = JSON.parse(savedTestCases)
      if (testSuites.length === 0) {
        setError("No saved test cases found")
        return
      }
      
      // Load the most recent test suite
      const latestTestSuite = testSuites[testSuites.length - 1]
      setUrl(latestTestSuite.url)
      setSessionId(latestTestSuite.sessionId)
      setTestCases(latestTestSuite.testCases)
      setSuccessMessage(`Loaded test cases for ${latestTestSuite.url} from ${new Date(latestTestSuite.date).toLocaleString()}`)
    } catch (e) {
      setError("Failed to load saved test cases")
      console.error('Failed to parse saved test cases', e)
    }
  }
  
  const importTestCases = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        if (importedData.testCases) {
          setUrl(importedData.url || "")
          setTestCases(importedData.testCases)
          setSuccessMessage(`Imported ${importedData.testCases.length} test cases successfully!`)
        } else {
          throw new Error('Invalid test cases file format')
        }
      } catch (error: any) {
        setError(`Failed to import test cases: ${error.message}`)
      }
    }
    reader.readAsText(file)
  }

  return (
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
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="maestro">Maestro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/80">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Generate Test Cases"
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={loadSavedTestCases}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  Load Saved Tests
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    id="import-test-cases"
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    accept=".json"
                    onChange={importTestCases}
                  />
                  <Button 
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary/10"
                    asChild
                  >
                    <label htmlFor="import-test-cases" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Tests
                    </label>
                  </Button>
                </div>
              </div>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {successMessage && (
              <Alert className="mt-4 bg-green-500/10 border-green-500/50">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

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
                  <Button 
                    onClick={handleGenerateMore} 
                    disabled={isLoading} 
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
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
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Export Options</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={saveTestCases}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Tests
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleExport("json")}
                    className="border-secondary text-secondary hover:bg-secondary/10"
                  >
                    JSON
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleExport("csv")}
                    className="border-secondary text-secondary hover:bg-secondary/10"
                  >
                    CSV
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleExport("maestro")}
                    className="border-secondary text-secondary hover:bg-secondary/10"
                  >
                    Maestro
                  </Button>
                </div>
              </div>

              <div className="border rounded-md w-full overflow-hidden">
                <div className="p-3 border-b bg-muted/50 font-medium">Test Cases ({testCases.length})</div>
                <div className="divide-y">
                  {testCases.map((testCase, index) => (
                    <div key={testCase.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium text-primary">{testCase.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          testCase.priority === "High" 
                            ? "bg-red-500/20 text-red-400" 
                            : testCase.priority === "Medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }`}>
                          {testCase.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{testCase.description}</p>
                      <div className="mt-2">
                        <details className="text-sm">
                          <summary className="cursor-pointer hover:text-primary transition-colors">
                            View Steps
                          </summary>
                          <div className="mt-2 pl-4 border-l-2 border-primary/30">
                            {testCase.steps.map((step: any) => (
                              <div key={step.step} className="mb-2">
                                <p><strong>Step {step.step}:</strong> {step.action}</p>
                                <p className="text-muted-foreground">Expected: {step.expected}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="execute">
        <Card>
          <CardHeader>
            <CardTitle>Test Execution</CardTitle>
            <CardDescription>
              This feature is coming soon. You'll be able to execute your generated test cases against websites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-primary/20 p-4 mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="text-xl font-medium mb-2">Test Execution In Development</h3>
              <p className="text-muted-foreground max-w-md">
                We're currently building this feature to allow you to execute the generated test cases
                directly against your website. Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
    // You can also implement your own analytics here
    console.log(`Analytics: ${event}, ${category}, ${label}`)
  }
})
