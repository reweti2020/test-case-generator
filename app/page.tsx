import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, LineChart, TestTube2 } from "lucide-react"

export default function Home() {
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
              <Link
                href="/create"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Create Test
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    AI-Powered Testing for Your Web Applications
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Automatically scrape websites, generate test cases using AI, execute tests, and get detailed
                    reports.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/create">
                    <Button size="lg">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-full overflow-hidden rounded-xl border bg-background p-4 shadow-xl">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <div className="ml-2 text-sm font-medium">Test Results</div>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2 rounded-lg border p-4">
                        <div className="text-sm font-medium">Tests Passed</div>
                        <div className="text-2xl font-bold text-green-500">12</div>
                      </div>
                      <div className="flex flex-col gap-2 rounded-lg border p-4">
                        <div className="text-sm font-medium">Tests Failed</div>
                        <div className="text-2xl font-bold text-red-500">2</div>
                      </div>
                      <div className="col-span-2 flex flex-col gap-2 rounded-lg border p-4">
                        <div className="text-sm font-medium">Test Coverage</div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-full w-[85%] rounded-full bg-primary" />
                        </div>
                        <div className="text-xs text-muted-foreground">85% of critical paths tested</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border p-4">
                      <div className="text-sm font-medium">Recent Tests</div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Login Flow</span>
                        <span className="text-green-500">Passed</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Checkout Process</span>
                        <span className="text-red-500">Failed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">How It Works</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our AI-powered testing tool simplifies the testing process with three easy steps.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <TestTube2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">1. Website Scraping</h3>
                <p className="text-muted-foreground">
                  Our tool analyzes your website to understand its structure, elements, and workflows.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Code className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">2. AI Test Generation</h3>
                <p className="text-muted-foreground">
                  Using OpenAI, we generate comprehensive test cases based on the website analysis.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <LineChart className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">3. Test Execution & Reporting</h3>
                <p className="text-muted-foreground">
                  Tests are executed automatically, and detailed reports are generated with pass/fail status.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 TestAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
