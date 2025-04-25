"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TestCaseList from "@/components/test-case-list"
import TestExecutor from "@/components/test-executor"
import { Loader2, Download, Upload, Save } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  
  const exportTestCasesAsJson = () => {
    if (testCases.length === 0) return
    
    const testSuite = {
      url,
      testCases,
      date: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(testSuite, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-cases-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSuccessMessage("Test cases exported to file successfully!")
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

                <div className="flex flex-wrap gap-2 justify-end">
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
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={loadSavedTestCases}
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
                    <Button variant="outline" asChild>
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
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Export Options</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={saveTestCases}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Tests
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportTestCasesAsJson}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Tests
                      </Button>
                    </div>
                  </div>
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
