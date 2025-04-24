"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Edit } from "lucide-react"

interface TestStep {
  step: number
  action: string
  expected: string
}

interface TestCaseProps {
  id: string
  title: string
  description: string
  priority: string
  steps: TestStep[]
  onEdit?: (id: string) => void
}

export function TestCaseCard({ id, title, description, priority, steps, onEdit }: TestCaseProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-orange-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={toggleExpand}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="text-lg font-medium">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            <Badge className={getPriorityColor(priority)}>{priority}</Badge>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4 pt-2">
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Test Steps:</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left text-xs font-medium w-16">Step</th>
                    <th className="p-2 text-left text-xs font-medium">Action</th>
                    <th className="p-2 text-left text-xs font-medium">Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.step} className="border-t">
                      <td className="p-2 text-xs">{step.step}</td>
                      <td className="p-2 text-xs">{step.action}</td>
                      <td className="p-2 text-xs">{step.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
