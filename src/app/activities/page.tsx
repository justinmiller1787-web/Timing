'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Activity } from '@/lib/types'
import { getActivities, addActivity, removeActivity, renameActivity, getActivityColors, setActivityColors } from '@/lib/storage'
import { COLOR_PALETTE, resolveColor, pickAutoColor } from '@/lib/colors'
import { LiquidGlass } from '@/components/ui/liquid-glass'

// ── Color picker swatch + popup ───────────────────────────────────────────────

function ColorPicker({
  activity,
  color,
  isOpen,
  onOpen,
  onClose,
  onSelect,
}: {
  activity: string
  color: string
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onSelect: (hex: string) => void
}) {
  const swatchRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (swatchRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  // After popup renders, measure it and flip above if it overflows the viewport.
  useEffect(() => {
    if (!isOpen || !popupRef.current) return
    const popupRect = popupRef.current.getBoundingClientRect()
    if (popupRect.bottom > window.innerHeight) {
      const swatchRect = swatchRef.current!.getBoundingClientRect()
      setPos((prev) => ({
        ...prev,
        top: swatchRect.top - popupRect.height - 6,
      }))
    }
  }, [isOpen])

  const handleSwatchClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOpen) {
      onClose()
    } else {
      const rect = swatchRef.current!.getBoundingClientRect()
      setPos({ top: rect.bottom + 6, left: rect.left })
      onOpen()
    }
  }

  const popup = isOpen && mounted ? createPortal(
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-lg shadow-xl p-3"
    >
      <div className="grid grid-cols-5 gap-2">
        {COLOR_PALETTE.map(({ name, hex }) => (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => { onSelect(hex); onClose() }}
            className="w-6 h-6 rounded-md transition-transform hover:scale-125 focus:outline-none"
            style={{
              backgroundColor: hex,
              boxShadow: color === hex ? `0 0 0 2px white` : undefined,
            }}
          />
        ))}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={swatchRef}
        type="button"
        onClick={handleSwatchClick}
        className="w-5 h-5 rounded shrink-0 border border-white/30 transition-transform hover:scale-110 focus:outline-none"
        style={{ backgroundColor: color }}
        title="Change color"
      />
      {popup}
    </>
  )
}

// ── Activity list item ────────────────────────────────────────────────────────

function ActivityItem({
  activity,
  color,
  isPickerOpen,
  onOpenPicker,
  onClosePicker,
  onColorChange,
  onRemove,
  onRename,
}: {
  activity: Activity
  color: string
  isPickerOpen: boolean
  onOpenPicker: () => void
  onClosePicker: () => void
  onColorChange: (hex: string) => void
  onRemove: () => void
  onRename: (newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(activity)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setDraft(activity)
    setEditing(true)
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const confirm = () => {
    if (draft.trim() && draft.trim() !== activity) {
      onRename(draft.trim())
    }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(activity)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 px-3 py-2 border border-white/20 rounded bg-white/5">
        <ColorPicker
          activity={activity}
          color={color}
          isOpen={isPickerOpen}
          onOpen={onOpenPicker}
          onClose={onClosePicker}
          onSelect={onColorChange}
        />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent border-0 border-b border-white/40 text-gray-200 focus:outline-none focus:border-white/70 py-0.5"
        />
        <button
          type="button"
          onClick={confirm}
          className="text-green-400 hover:text-green-300 text-2xl font-bold shrink-0 leading-none"
          aria-label="Confirm"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-sm shrink-0"
        >
          Remove
        </button>
      </li>
    )
  }

  return (
    <li
      className="flex items-center justify-between gap-2 px-3 py-2 border border-white/20 rounded bg-white/5 cursor-pointer select-none"
      onDoubleClick={startEdit}
      title="Double-click to edit"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ColorPicker
          activity={activity}
          color={color}
          isOpen={isPickerOpen}
          onOpen={onOpenPicker}
          onClose={onClosePicker}
          onSelect={onColorChange}
        />
        <span className="truncate text-gray-200">{activity}</span>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        onDoubleClick={(e) => e.stopPropagation()}
        className="text-red-400 hover:text-red-300 text-sm shrink-0"
      >
        Remove
      </button>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [colors, setColors] = useState<Record<string, string>>({})
  const [newActivity, setNewActivity] = useState('')
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)

  const sortAlpha = (list: Activity[]) =>
    [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  useEffect(() => {
    setActivities(sortAlpha(getActivities()))
    setColors(getActivityColors())
  }, [])

  const getColor = (activity: string) =>
    resolveColor(activity, colors)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newActivity.trim()
    if (!trimmed) return
    const updated = addActivity(trimmed)
    // Auto-assign a color only if this activity doesn't already have one
    if (!colors[trimmed]) {
      const allResolved: Record<string, string> = {}
      activities.forEach((a) => { allResolved[a] = resolveColor(a, colors) })
      const autoColor = pickAutoColor(allResolved)
      const updatedColors = { ...colors, [trimmed]: autoColor }
      setColors(updatedColors)
      setActivityColors(updatedColors)
    }
    setActivities(sortAlpha(updated))
    setNewActivity('')
  }

  const handleRemove = (name: Activity) => {
    const updated = removeActivity(name)
    setActivities(sortAlpha(updated))
    // Clean up color for removed activity
    const updatedColors = { ...colors }
    delete updatedColors[name]
    setColors(updatedColors)
    setActivityColors(updatedColors)
    if (openPickerId === name) setOpenPickerId(null)
  }

  const handleRename = (oldName: Activity, newName: string) => {
    const updated = renameActivity(oldName, newName)
    setActivities(sortAlpha(updated))
    // Migrate color to new name
    const updatedColors = { ...colors }
    const existing = updatedColors[oldName]
    if (existing) {
      updatedColors[newName] = existing
      delete updatedColors[oldName]
    }
    setColors(updatedColors)
    setActivityColors(updatedColors)
    if (openPickerId === oldName) setOpenPickerId(null)
  }

  const handleColorChange = (activity: string, hex: string) => {
    const updatedColors = { ...colors, [activity]: hex }
    setColors(updatedColors)
    setActivityColors(updatedColors)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6">
      <h1 className="text-3xl font-bold mb-6">Activities</h1>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-6">
        <LiquidGlass compact className="rounded-xl flex-1">
          <input
            type="text"
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="New activity name"
            className="w-full px-3 py-2 bg-transparent border-0 border-transparent rounded text-white placeholder-gray-400 focus:ring-1 focus:ring-white/30 focus:outline-none"
          />
        </LiquidGlass>
        <LiquidGlass compact className="rounded-xl sm:w-auto w-full">
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-transparent text-white rounded hover:bg-white/10 transition-colors shadow-none"
          >
            Add
          </button>
        </LiquidGlass>
      </form>

      {activities.length === 0 ? (
        <p className="text-gray-500">No activities yet.</p>
      ) : (
        <ul
          className="scrollbar-glass space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: '60vh' }}
        >
          {activities.map((activity) => (
            <ActivityItem
              key={activity}
              activity={activity}
              color={getColor(activity)}
              isPickerOpen={openPickerId === activity}
              onOpenPicker={() => setOpenPickerId(activity)}
              onClosePicker={() => setOpenPickerId(null)}
              onColorChange={(hex) => handleColorChange(activity, hex)}
              onRemove={() => handleRemove(activity)}
              onRename={(newName) => handleRename(activity, newName)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
