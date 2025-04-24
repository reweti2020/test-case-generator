"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

interface TestCaseListProps {
  testCases: TestCase[]
}

export default function TestCaseList({ testCases }: TestCaseListProps) {
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({})
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [editedCase, setEditedCase] = useState<TestCase | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedCases((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleEdit = (testCase: TestCase) => {
    setEditingCase(testCase)
    setEditedCase(JSON.parse(JSON.stringify(testCase)))
  }

  const handleSave = () => {
    if (!editedCase) return

    // In a real app, you would save this to your backend
    // For now, we'll just update the UI
    const index = testCases.findIndex((tc) => tc.id === editedCase.id)
    if (index !== -1) {
      testCases[index] = editedCase
    }

    // Save to localStorage for persistence
    const corrections = JSON.parse(localStorage.getItem("testCaseCorrections") || "{}")
    if (!corrections[window.location.href]) {
      corrections[window.location.href] = {}
    }
    corrections[window.location.href][editedCase.id] = editedCase
    localStorage.setItem("testCaseCorrections", JSON.stringify(corrections))

    setEditingCase(null)
  }

  const handleStepChange = (index: number, field: "action" | "expected", value: string) => {
    if (!editedCase) return

    const newSteps = [...editedCase.steps]
    newSteps[index] = {
      ...newSteps[index],
      [field]: value,
    }

    setEditedCase({
      ...editedCase,
      steps: newSteps,
    })
  }

  if (testCases.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No test cases generated yet.</div>
  }

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-medium">Generated Test Cases ({testCases.length})</h3>

      {testCases.map((testCase) => (
        <Card key={testCase.id} className="w-full">
          <CardHeader
            className="p-4 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleExpand(testCase.id)}
          >
            <div className="flex items-center">
              {expandedCases[testCase.id] ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              <h4 className="font-medium">{testCase.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(testCase)
                }}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Badge
                variant={
                  testCase.priority === "High"
                    ? "destructive"
                    : testCase.priority === "Medium"
                      ? "default"
                      : "secondary"
                }
              >
                {testCase.priority}
              </Badge>
            </div>
          </CardHeader>

          {expandedCases[testCase.id] && (
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground mb-4">{testCase.description}</p>

              <div className="space-y-3">
                <h5 className="text-sm font-medium">Test Steps:</h5>
                <div className="space-y-3">
                  {testCase.steps.map((step, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-md border-l-2 border-primary">
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                        <div className="font-medium text-sm">Step {step.step}:</div>
                        <div className="text-sm">{step.action}</div>
                        <div className="font-medium text-sm">Expected:</div>
                        <div className="text-sm">{step.expected}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test Case</DialogTitle>
          </DialogHeader>

          {editedCase && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedCase.title}
                    onChange={(e) => setEditedCase({ ...editedCase, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedCase.description}
                    onChange={(e) => setEditedCase({ ...editedCase, description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Test Steps</h4>
                <div className="space-y-4">
                  {editedCase.steps.map((step, index) => (
                    <div key={index} className="p-4 border rounded-md bg-muted/30">
                      <div className="font-medium mb-2">Step {step.step}</div>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`step-${index}-action`}>Action</Label>
                          <Input
                            id={`step-${index}-action`}
                            value={step.action}
                            onChange={(e) => handleStepChange(index, "action", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`step-${index}-expected`}>Expected Result</Label>
                          <Input
                            id={`step-${index}-expected`}
                            value={step.expected}
                            onChange={(e) => handleStepChange(index, "expected", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCase(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
