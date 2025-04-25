import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "../components/theme-provider"
import type React from "react"

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-inter',
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
