import { NextResponse } from "next/server"
import { generateTests } from "@/lib/test-generator"
import type { ScrapingResult } from "@/lib/scraper"

export async function POST(request: Request) {
  try {
    const { scrapingResult } = await request.json()

    if (!scrapingResult) {
      return NextResponse.json({ error: "Scraping result is required" }, { status: 400 })
    }

    // Generate actual tests using AI
    const generatedTests = await generateTests(scrapingResult as ScrapingResult)

    return NextResponse.json({ success: true, data: generatedTests })
  } catch (error) {
    console.error("Error generating tests:", error)
    return NextResponse.json(
      {
        error: "Failed to generate tests",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
