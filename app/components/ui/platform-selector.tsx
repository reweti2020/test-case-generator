// app/platform-selector.tsx
"use client"

import type React from "react"

import { useState } from "react"

type Platform = "web" | "ios" | "android"

interface PlatformSelectorProps {
  onPlatformChange: (platform: Platform) => void
  initialPlatform?: Platform
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onPlatformChange, initialPlatform = "web" }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform)

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform)
    onPlatformChange(platform)
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        className={`px-4 py-2 rounded-md ${selectedPlatform === "web" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => handlePlatformChange("web")}
      >
        Web
      </button>
      <button
        className={`px-4 py-2 rounded-md ${selectedPlatform === "ios" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => handlePlatformChange("ios")}
      >
        iOS
      </button>
      <button
        className={`px-4 py-2 rounded-md ${selectedPlatform === "android" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => handlePlatformChange("android")}
      >
        Android
      </button>
    </div>
  )
}

export default PlatformSelector
