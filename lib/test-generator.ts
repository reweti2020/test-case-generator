import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { ScrapingResult } from "./scraper"

export interface TestCase {
  id: string
  name: string
  description: string
  steps: string[]
}

export interface GeneratedTests {
  url: string
  testPlan: string
  testCases: TestCase[]
  testCode: string
}

export async function generateTests(scrapingResult: ScrapingResult): Promise<GeneratedTests> {
  // Create a simplified version of the scraping result to avoid token limits
  const simplifiedResult = {
    url: scrapingResult.url,
    title: scrapingResult.title,
    description: scrapingResult.description,
    elements: {
      links: scrapingResult.elements.links.slice(0, 10),
      buttons: scrapingResult.elements.buttons.slice(0, 10),
      forms: scrapingResult.elements.forms,
      images: scrapingResult.elements.images.slice(0, 5),
    },
    structure: scrapingResult.structure,
  }

  // Generate test plan
  const testPlanPrompt = `
You are an expert test engineer. Based on the following website structure, create a comprehensive test plan:

${JSON.stringify(simplifiedResult, null, 2)}

The test plan should include:
1. Critical paths to test
2. Key functionality to verify
3. Important user flows
4. Edge cases to consider

Format the response as Markdown.
`

  const { text: testPlan } = await generateText({
    model: openai("gpt-4o"),
    prompt: testPlanPrompt,
    system: "You are an expert test engineer specializing in web application testing.",
  })

  // Generate test cases
  const testCasesPrompt = `
Based on the following website structure and test plan, generate 5-10 specific test cases:

Website Structure:
${JSON.stringify(simplifiedResult, null, 2)}

Test Plan:
${testPlan}

For each test case, provide:
1. A descriptive name
2. A brief description of what the test verifies
3. Step-by-step instructions for executing the test

Format the response as JSON with the following structure:
[
  {
    "id": "test-1",
    "name": "Test name",
    "description": "Test description",
    "steps": ["Step 1", "Step 2", "..."]
  }
]
`

  const { text: testCasesText } = await generateText({
    model: openai("gpt-4o"),
    prompt: testCasesPrompt,
    system: "You are an expert test engineer. Generate specific, actionable test cases in JSON format.",
  })

  let testCases: TestCase[]
  try {
    testCases = JSON.parse(testCasesText)
  } catch (error) {
    console.error("Failed to parse test cases JSON:", error)
    // Fallback to a simple structure if parsing fails
    testCases = [
      {
        id: "test-1",
        name: "Basic page load test",
        description: "Verify the page loads correctly",
        steps: ["Navigate to the URL", "Verify page title"],
      },
    ]
  }

  // Generate Playwright test code
  const testCodePrompt = `
Generate Playwright test code for the following test cases and website:

Website: ${scrapingResult.url}
Title: ${scrapingResult.title}

Test Cases:
${JSON.stringify(testCases, null, 2)}

Write complete, runnable Playwright test code that implements these test cases.
Use TypeScript and the Playwright test framework.
Include proper assertions and error handling.
`

  const { text: testCode } = await generateText({
    model: openai("gpt-4o"),
    prompt: testCodePrompt,
    system: "You are an expert automation engineer specializing in Playwright. Generate working test code.",
  })

  return {
    url: scrapingResult.url,
    testPlan,
    testCases,
    testCode,
  }
}
