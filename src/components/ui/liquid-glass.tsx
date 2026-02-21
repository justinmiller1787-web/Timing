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
        className={`relative rounded-2xl border border-white/20 bg-white/5 backdrop-blur-2xl ${className}`}
        {...props}
      >
        {/* Decorative layers — overflow-hidden lives here so dropdowns can escape the outer container */}
        <div className="absolute inset-0 rounded-2xl overflow-visible pointer-events-none z-0">
          {/* Animated background layer */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                180deg,
                transparent 0px,
                transparent 50px,
                rgba(255,255,255,0.03) 51px,
                rgba(255,255,255,0.06) 100px,
                transparent 101px,
                transparent 150px
              )`,
              backgroundSize: "100% 1000%",
              animation: "moveBackground 60s linear infinite",
            }}
          />
          {/* Glass filter overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/8 to-transparent" />
        </div>
        {/* Content */}
        <div className={`relative z-20 pointer-events-auto ${compact ? "p-2" : "p-6"}`}>{children}</div>
      </div>
    )
  }
)

LiquidGlass.displayName = "LiquidGlass"

export { LiquidGlass, LiquidGlass as Component }
