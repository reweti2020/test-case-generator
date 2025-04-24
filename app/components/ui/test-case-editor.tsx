"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TestStep {
  step: number
  action: string
  expected: string
}

interface TestCase {
  id: string
  title: string
  description: string
  priority: string
  steps: TestStep[]
}

interface TestCaseEditorProps {
  testCase: TestCase | null
  isOpen: boolean
  onClose: () => void
  onSave: (testCase: TestCase) => void
}

export function TestCaseEditor({ testCase, isOpen, onClose, onSave }: TestCaseEditorProps) {
  const [editedTestCase, setEditedTestCase] = useState<TestCase | null>(null)

  useEffect(() => {
    if (testCase) {
      setEditedTestCase({ ...testCase, steps: [...testCase.steps] })
    }
  }, [testCase])

  if (!editedTestCase) return null

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTestCase({ ...editedTestCase, title: e.target.value })
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTestCase({ ...editedTestCase, description: e.target.value })
  }

  const handlePriorityChange = (value: string) => {
    setEditedTestCase({ ...editedTestCase, priority: value })
  }

  const handleStepActionChange = (index: number, value: string) => {
    const updatedSteps = [...editedTestCase.steps]
    updatedSteps[index] = { ...updatedSteps[index], action: value }
    setEditedTestCase({ ...editedTestCase, steps: updatedSteps })
  }

  const handleStepExpectedChange = (index: number, value: string) => {
    const updatedSteps = [...editedTestCase.steps]
    updatedSteps[index] = { ...updatedSteps[index], expected: value }
    setEditedTestCase({ ...editedTestCase, steps: updatedSteps })
  }

  const handleSave = () => {
    onSave(editedTestCase)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test Case</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input id="title" value={editedTestCase.title} onChange={handleTitleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={editedTestCase.description}
              onChange={handleDescriptionChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Priority
            </Label>
            <Select value={editedTestCase.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Test Steps</h3>
            {editedTestCase.steps.map((step, index) => (
              <div key={step.step} className="border p-4 rounded-md mb-4">
                <div className="font-medium mb-2">Step {step.step}</div>
                <div className="grid gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`step-${index}-action`} className="text-right">
                      Action
                    </Label>
                    <Input
                      id={`step-${index}-action`}
                      value={step.action}
                      onChange={(e) => handleStepActionChange(index, e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`step-${index}-expected`} className="text-right">
                      Expected Result
                    </Label>
                    <Input
                      id={`step-${index}-expected`}
                      value={step.expected}
                      onChange={(e) => handleStepExpectedChange(index, e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
