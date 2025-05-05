import { chromium } from "playwright"

export interface ScrapingResult {
  url: string
  title: string
  description: string
  elements: {
    links: { text: string; url: string }[]
    buttons: { text: string; selector: string }[]
    forms: { id: string; fields: { name: string; type: string }[] }[]
    images: { alt: string; src: string }[]
  }
  structure: {
    header: boolean
    navigation: boolean
    main: boolean
    footer: boolean
  }
  html: string
}

export async function scrapeWebsite(url: string): Promise<ScrapingResult> {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: "networkidle" })

    // Get basic page info
    const title = await page.title()
    const description = await page.evaluate(() => {
      const metaDescription = document.querySelector('meta[name="description"]')
      return metaDescription ? metaDescription.getAttribute("content") : ""
    })

    // Extract links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          text: a.textContent?.trim() || "",
          url: a.href,
        }))
        .filter((link) => link.url && !link.url.startsWith("javascript:"))
    })

    // Extract buttons
    const buttons = await page.evaluate(() => {
      const buttonElements = [
        ...Array.from(document.querySelectorAll("button")),
        ...Array.from(document.querySelectorAll('input[type="button"]')),
        ...Array.from(document.querySelectorAll('input[type="submit"]')),
        ...Array.from(document.querySelectorAll('[role="button"]')),
      ]

      return buttonElements.map((btn, index) => {
        const text = btn.textContent?.trim() || btn.getAttribute("value") || ""
        // Create a unique selector for this button
        const selector = btn.id
          ? `#${btn.id}`
          : btn.className
            ? `.${btn.className.split(" ").join(".")}`
            : `button:nth-of-type(${index + 1})`

        return { text, selector }
      })
    })

    // Extract forms
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("form")).map((form, index) => {
        const formId = form.id || `form-${index}`
        const fields = Array.from(form.querySelectorAll("input, select, textarea")).map((field) => ({
          name: field.getAttribute("name") || field.getAttribute("id") || "",
          type: field.getAttribute("type") || field.tagName.toLowerCase(),
        }))

        return { id: formId, fields }
      })
    })

    // Extract images
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img")).map((img) => ({
        alt: img.getAttribute("alt") || "",
        src: img.getAttribute("src") || "",
      }))
    })

    // Detect page structure
    const structure = await page.evaluate(() => {
      return {
        header: !!document.querySelector("header") || !!document.querySelector('[role="banner"]'),
        navigation: !!document.querySelector("nav") || !!document.querySelector('[role="navigation"]'),
        main: !!document.querySelector("main") || !!document.querySelector('[role="main"]'),
        footer: !!document.querySelector("footer") || !!document.querySelector('[role="contentinfo"]'),
      }
    })

    // Get the HTML for further analysis
    const html = await page.content()

    return {
      url,
      title,
      description,
      elements: {
        links,
        buttons,
        forms,
        images,
      },
      structure,
      html,
    }
  } finally {
    await browser.close()
  }
}
