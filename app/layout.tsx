import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "../components/theme-provider"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

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
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body className={`${inter.className} bg-[#0f172a] text-[#f8fafc]`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
