"use client"

import * as React from "react"

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  className?: string
  compact?: boolean
}

const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ children, className = "", compact = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative rounded-2xl border border-white/15 bg-white/1 backdrop-blur-md ${className}`}
        {...props}
      >
        {/* Decorative layers — overflow-hidden lives here so dropdowns can escape the outer container */}
        <div className="absolute inset-0 rounded-2xl overflow-visible pointer-events-none z-0">
          {/* Glass filter overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/2 to-transparent" />
        </div>
        {/* Content */}
        <div className={`relative z-20 pointer-events-auto [&_button]:bg-white/10 ${compact ? "p-2" : "p-6"}`}>{children}</div>
      </div>
    )
  }
)

LiquidGlass.displayName = "LiquidGlass"

export { LiquidGlass, LiquidGlass as Component }
