import { NextResponse } from "next/server"
import { executeTests } from "@/lib/test-executor"
import type { TestCase } from "@/lib/test-generator"

export async function POST(request: Request) {
  try {
    const { url, testCases, testCode, testPlan } = await request.json()

    if (!testCases || !url || !testCode) {
      return NextResponse.json({ error: "Test cases, URL, and test code are required" }, { status: 400 })
    }

    // Execute the tests
    const testResults = await executeTests(url, testCases as TestCase[], testCode as string, testPlan as string)

    return NextResponse.json({ success: true, data: testResults })
  } catch (error) {
    console.error("Error executing tests:", error)
    return NextResponse.json(
      {
        error: "Failed to execute tests",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
