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
        <style>
          {`
            /* Enforce VelocityQA color scheme */
            body {
              background-color: #0f172a !important;
              color: #f8fafc !important;
            }
            
            /* Card overrides */
            [class*="card"], [class*="Card"] {
              background-color: #1e293b !important;
              border-color: #334155 !important;
            }
            
            /* Button overrides */
            button[class*="primary"], 
            button[data-variant="default"] {
              background-color: #20C5C6 !important;
              color: white !important;
            }
            
            button[class*="secondary"], 
            button[data-variant="secondary"] {
              background-color: #ff5500 !important;
              color: white !important;
            }
            
            /* Input overrides */
            input, select, textarea {
              background-color: #0f172a !important;
              border-color: #334155 !important;
              color: #f8fafc !important;
            }
          `}
        </style>
      </head>
      <body className={`${inter.className} bg-[#0f172a] text-[#f8fafc]`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
