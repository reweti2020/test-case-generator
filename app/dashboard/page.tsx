"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Filter, Plus, Search, TestTube2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tests, setTests] = useState<any[]>([])

  useEffect(() => {
    // In a real app, you would fetch this from an API
    // For now, we'll get all tests from localStorage
    const allTests: any[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("test-")) {
        try {
          const testData = JSON.parse(localStorage.getItem(key) || "")
          allTests.push(testData)
        } catch (error) {
          console.error("Error parsing test data:", error)
        }
      }
    }

    // Sort by date (newest first)
    allTests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTests(allTests)
  }, [])

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.url.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || test.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
              <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
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
      <main className="flex-1 py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter">Test Dashboard</h1>
              <p className="text-muted-foreground">View and manage your test history</p>
            </div>
            <Button onClick={() => router.push("/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Test
            </Button>
          </div>
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>A list of all tests you've run</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="passed">Passed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pass Rate</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTests.length > 0 ? (
                        filteredTests.map((test) => (
                          <TableRow key={test.id}>
                            <TableCell className="font-medium">{test.url}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {test.date}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={test.status === "passed" ? "success" : "destructive"}>
                                {test.status === "passed" ? "Passed" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell>{test.passRate}%</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                {test.duration}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/results/${test.id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No tests found.
                            <Link href="/create" className="ml-1 text-primary hover:underline">
                              Create your first test
                            </Link>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
