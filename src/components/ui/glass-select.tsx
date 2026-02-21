"use client"

import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export interface GlassSelectOption {
  value: string
  label: string
  disabled?: boolean
  separator?: boolean
}

interface GlassSelectProps {
  value: string
  onChange: (value: string) => void
  options: GlassSelectOption[]
  placeholder?: string
  className?: string
}

const GlassSelect = ({ value, onChange, options, placeholder = "Select…", className }: GlassSelectProps) => {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Position the portal dropdown under the trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }

  const handleToggle = () => {
    if (!open) updatePosition()
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleScroll = () => {
      updatePosition()
    }
    document.addEventListener("mousedown", handleOutsideClick)
    window.addEventListener("scroll", handleScroll, true)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [open])

  // Exclude separators from matching — a separator with value="" must not
  // shadow the placeholder when the actual selected value is also ""
  const selected = options.find((o) => o.value === value && !o.disabled && !o.separator)

  const dropdown = open ? (
    <ul
      ref={containerRef}
      style={{
        ...dropdownStyle,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
        overflow: "hidden",
        padding: "4px 0",
      }}
    >
      {options.map((option, i) =>
        option.separator ? (
          <li key={i} className="mx-3 my-1 border-t border-white/10" aria-hidden />
        ) : (
          <li key={option.value + i}>
            <button
              type="button"
              disabled={option.disabled}
              onMouseDown={(e) => {
                // prevent the outside-click handler from firing before onChange
                e.stopPropagation()
                if (!option.disabled) {
                  onChange(option.value)
                  setOpen(false)
                }
              }}
              className={cn(
                "w-full px-4 py-2 text-left text-sm transition-colors",
                option.value === value && !option.disabled && !option.separator
                  ? "text-white bg-white/10"
                  : "text-gray-300 hover:bg-white/10 hover:text-white",
                option.disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {option.label}
            </button>
          </li>
        )
      )}
    </ul>
  ) : null

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-2 text-left focus:outline-none focus:ring-1 focus:ring-white/30 flex items-center justify-between"
      >
        <span className={selected ? "text-white" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal: renders outside any stacking context */}
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  )
}

GlassSelect.displayName = "GlassSelect"
export { GlassSelect }
