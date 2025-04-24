"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface PlatformSelectorProps {
  onSubmit: (data: {
    platform: string
    url?: string
    appId?: string
    appPlatform?: string
    appVersion?: string
  }) => void
  isLoading: boolean
}

export default function PlatformSelector({ onSubmit, isLoading }: PlatformSelectorProps) {
  const [platform, setPlatform] = useState<string>("web")
  const [url, setUrl] = useState<string>("")
  const [appId, setAppId] = useState<string>("")
  const [appPlatform, setAppPlatform] = useState<string>("android")
  const [appVersion, setAppVersion] = useState<string>("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (platform === "web" && !url) {
      alert("Please enter a website URL")
      return
    }

    if (platform === "mobile" && !appId) {
      alert("Please enter an App ID")
      return
    }

    onSubmit({
      platform,
      url: platform === "web" ? url : undefined,
      appId: platform === "mobile" ? appId : undefined,
      appPlatform: platform === "mobile" ? appPlatform : undefined,
      appVersion: platform === "mobile" ? appVersion : undefined,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Case Generator</CardTitle>
        <CardDescription>Generate test cases for your website or mobile application</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="web" onValueChange={setPlatform} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="web">Website</TabsTrigger>
              <TabsTrigger value="mobile">Mobile App</TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the URL of the website you want to generate test cases for
                </p>
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="appId">App ID / Package Name</Label>
                <Input
                  id="appId"
                  placeholder="com.example.app"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appPlatform">Platform</Label>
                <Select value={appPlatform} onValueChange={setAppPlatform}>
                  <SelectTrigger id="appPlatform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appVersion">App Version (optional)</Label>
                <Input
                  id="appVersion"
                  placeholder="1.0.0"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Test Cases"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
