import { CheckCircle2, Code, Globe, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface TestProgressProps {
  currentStep: number
}

export function TestProgress({ currentStep }: TestProgressProps) {
  const steps = [
    {
      id: 1,
      name: "Website Scraping",
      description: "Analyzing website structure and elements",
      icon: Globe,
    },
    {
      id: 2,
      name: "Test Generation",
      description: "Creating test cases with AI",
      icon: Code,
    },
    {
      id: 3,
      name: "Test Execution",
      description: "Running tests and collecting results",
      icon: CheckCircle2,
    },
  ]

  const progress = (currentStep / steps.length) * 100

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="space-y-4">
            {steps.map((step) => {
              const isActive = currentStep >= step.id
              const isCurrentStep = currentStep === step.id

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    isActive ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCurrentStep ? <Loader2 className="h-4 w-4 animate-spin" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{step.name}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
