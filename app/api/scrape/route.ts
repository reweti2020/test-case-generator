import { NextResponse } from "next/server"
import { scrapeWebsite } from "@/lib/scraper"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Perform actual web scraping
    const scrapingResult = await scrapeWebsite(url)

    return NextResponse.json({ success: true, data: scrapingResult })
  } catch (error) {
    console.error("Error scraping website:", error)
    return NextResponse.json(
      {
        error: "Failed to scrape website",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
