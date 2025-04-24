// This is a new file, so we'll create a basic component here.
// You'll likely want to expand on this with your actual badge implementation.

import type * as React from "react"

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

const Badge: React.FC<BadgeProps> = ({ children, className }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/10 ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
