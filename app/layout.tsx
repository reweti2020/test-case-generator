import "./globals.css" 
import { Inter } from "next/font/google"
import { ThemeProvider } from "../components/theme-provider"
import type React from "react"

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata = {
  title: "Test Case Generator | VelocityQA",
  description: "Generate test cases by analyzing website elements",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
        >
          <div className="container mx-auto py-6 px-4">
            <header className="mb-8">
              <h1 className="text-4xl font-bold mb-2 text-foreground">
                Test Case Generator
              </h1>
              <p className="text-muted-foreground">
                Generate test cases by analyzing website elements. Enter a URL to get started.
              </p>
            </header>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
