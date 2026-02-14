"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Copy, Check } from "lucide-react"

const ShaderDemoScene = dynamic(
  () =>
    import("@/components/ui/shader-demo-scene").then((mod) => ({
      default: mod.ShaderDemoScene,
    })),
  { ssr: false }
)

export default function DemoOne() {
  const [intensity, setIntensity] = useState(1.5)
  const [speed, setSpeed] = useState(1.0)
  const [activeEffect, setActiveEffect] = useState<"shader" | "rings" | "combined">("shader")
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("pnpm i 21st")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <ShaderDemoScene speed={speed} intensity={intensity} mode={activeEffect} />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-8 left-8 pointer-events-auto" />

        {/* Effect Controls */}
        <div className="absolute bottom-8 left-8 pointer-events-auto">
          <div className="flex gap-2">
            {(["shader", "rings", "combined"] as const).map((effect) => (
              <button
                key={effect}
                onClick={() => setActiveEffect(effect)}
                className={`px-3 py-1.5 text-xs font-mono rounded border ${
                  activeEffect === effect
                    ? "bg-white/10 text-white border-white/30"
                    : "bg-transparent text-white/60 border-white/20 hover:text-white/80"
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="absolute bottom-8 right-8 pointer-events-auto space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 w-16">Speed</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-24 accent-white/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 w-16">Intensity</label>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-24 accent-white/60"
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-8 right-8 pointer-events-auto">
          <span className="text-xs text-white/40 font-mono">
            {activeEffect} • speed {speed.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Lighting overlay effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/3 w-32 h-32 bg-gray-800/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: `${3 / speed}s` }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-white/2 rounded-full blur-2xl animate-pulse"
          style={{ animationDuration: `${2 / speed}s`, animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-20 h-20 bg-gray-900/3 rounded-full blur-xl animate-pulse"
          style={{ animationDuration: `${4 / speed}s`, animationDelay: "0.5s" }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center font-mono text-xs text-white/40">
          <div>...21st-cli...</div>
          <div className="mt-1 flex items-center gap-2 justify-center">
            <span>pnpm i 21st.dev</span>
            <button
              onClick={copyToClipboard}
              className="pointer-events-auto opacity-30 hover:opacity-60 transition-opacity text-white/60 hover:text-white/80 p-1"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
