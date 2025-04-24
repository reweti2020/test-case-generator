"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const WorkflowGenerator: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Workflow Test Generator</CardTitle>
        <CardDescription>
          Coming soon! This feature will allow you to generate end-to-end workflow tests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This feature is under development. Stay tuned for updates!</p>
      </CardContent>
    </Card>
  )
}

export default WorkflowGenerator
