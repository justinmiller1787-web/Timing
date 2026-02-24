'use client'

import { useState, useEffect, useRef } from 'react'
import { RippleButton } from '@/components/ui/ripple-button'
import { getActivityColors } from '@/lib/storage'
import { resolveColor } from '@/lib/colors'
import { getEntries, updateEntry, deleteEntry } from '@/lib/entries'
import type { Entry } from '@/lib/entries'

// Display-only segment produced by splitting entries at midnight boundaries.
// Keeps the original entry id/activity so delete/drag still work on the real entry.
interface DisplaySegment extends Entry {
  originalStart: string
  originalEnd: string
}

// Returns the local-time midnight at the start of a given date's calendar day.
function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Returns the local-time midnight at the START of the next calendar day.
function nextLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}

// Checks if two dates fall on different local calendar days.
function differentDay(a: Date, b: Date): boolean {
  return a.getFullYear() !== b.getFullYear() ||
         a.getMonth() !== b.getMonth() ||
         a.getDate() !== b.getDate()
}

// Splits an entry into per-day display segments at local-midnight boundaries.
// E.g. 11:30 PM → 1:00 AM next day becomes:
//   seg 1: 11:30 PM → midnight
//   seg 2: midnight → 1:00 AM
function splitAtMidnights(entry: Entry): DisplaySegment[] {
  const start = new Date(entry.startTime)
  const end   = new Date(entry.endTime)

  if (!differentDay(start, end)) {
    return [{
      ...entry,
      originalStart: entry.startTime,
      originalEnd: entry.endTime,
    }]
  }

  const segments: DisplaySegment[] = []
  let cursor = start

  while (cursor.getTime() < end.getTime()) {
    const dayEnd = nextLocalMidnight(cursor)
    const segEnd = dayEnd.getTime() < end.getTime() ? dayEnd : end

    segments.push({
      id: entry.id,
      activity: entry.activity,
      startTime: cursor.toISOString(),
      endTime: segEnd.toISOString(),
      originalStart: entry.startTime,
      originalEnd: entry.endTime,
    })

    cursor = segEnd
  }

  return segments
}

function splitAll(entries: Entry[]): DisplaySegment[] {
  return entries.flatMap(splitAtMidnights)
}

// Two entries overlap iff startA < endB && endA > startB  (strict inequalities).
function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

// Assigns each entry a column index and total-column-count so overlapping
// entries render side-by-side (Google Calendar style).
function computeOverlapLayout(entries: Entry[]) {
  if (entries.length === 0) return []

  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const colEndTimes: number[] = []
  const cols: number[] = []

  for (const entry of sorted) {
    const start = new Date(entry.startTime).getTime()
    const end   = new Date(entry.endTime).getTime()

    let col = -1
    for (let c = 0; c < colEndTimes.length; c++) {
      if (colEndTimes[c] <= start) { col = c; break }
    }
    if (col === -1) { col = colEndTimes.length; colEndTimes.push(0) }

    colEndTimes[col] = end
    cols.push(col)
  }

  const totalColsArr = new Array<number>(sorted.length)
  let clusterStart = 0
  let clusterEnd   = new Date(sorted[0].endTime).getTime()

  for (let i = 1; i <= sorted.length; i++) {
    const start = i < sorted.length ? new Date(sorted[i].startTime).getTime() : Infinity

    if (start >= clusterEnd) {
      const tc = Math.max(...cols.slice(clusterStart, i)) + 1
      for (let j = clusterStart; j < i; j++) totalColsArr[j] = tc
      clusterStart = i
      clusterEnd   = i < sorted.length ? new Date(sorted[i].endTime).getTime() : Infinity
    } else {
      clusterEnd = Math.max(clusterEnd, new Date(sorted[i].endTime).getTime())
    }
  }

  return sorted.map((entry, i) => ({ entry, col: cols[i], totalCols: totalColsArr[i] }))
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [activityColors, setActivityColors] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const MINUTE_HEIGHT = 2

  const [dragState, setDragState] = useState<{
    id: string
    type: 'move' | 'resizeTop' | 'resizeBottom'
    originalStart: string
    originalEnd: string
    startClientY: number
  } | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Tracks the final state of the entry being dragged so we can persist it
  // to Supabase on mouseup without firing one request per mousemove event.
  const draggedFinalRef = useRef<Entry | null>(null)

  useEffect(() => {
    getEntries().then((data) => setEntries(data))
    setActivityColors(getActivityColors())
  }, [])

  const getRange = (mode: 'day' | 'week' | 'month', date: Date) => {
    const start = new Date(date)

    if (mode === 'day') {
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { start, end }
    }

    if (mode === 'week') {
      const day = start.getDay() // 0 = Sunday
      start.setDate(start.getDate() - day)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end }
    }

    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)

    return { start, end }
  }

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatRangeLabel = () => {
    const { start, end } = getRange(viewMode, currentDate)

    if (viewMode === 'day') {
      return start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }

    if (viewMode === 'week') {
      const endDisplay = new Date(end)
      endDisplay.setDate(endDisplay.getDate() - 1)

      const startText = start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })

      const endText = endDisplay.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })

      return `Week of ${startText} – ${endText}`
    }

    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)

      if (viewMode === 'day') {
        next.setDate(next.getDate() - 1)
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() - 7)
      } else {
        next.setMonth(next.getMonth() - 1)
      }

      return next
    })
  }

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev)

      if (viewMode === 'day') {
        next.setDate(next.getDate() + 1)
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7)
      } else {
        next.setMonth(next.getMonth() + 1)
      }

      return next
    })
  }

  const { start: rangeStart, end: rangeEnd } = getRange(viewMode, currentDate)

  // Include any entry that overlaps the current range (not just starts within it),
  // so midnight-crossing entries show their second-day segment on the next day.
  const filteredEntries = entries.filter((entry) => {
    const eStart = new Date(entry.startTime).getTime()
    const eEnd   = new Date(entry.endTime).getTime()
    return eStart < rangeEnd.getTime() && eEnd > rangeStart.getTime()
  })

  // Split entries at midnight boundaries, then group the display segments by day.
  const groupEntriesByDay = (list: Entry[]) => {
    const segments = splitAll(list)
    const groups: Record<string, DisplaySegment[]> = {}

    segments.forEach((seg) => {
      const date = new Date(seg.startTime)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const key = `${year}-${month}-${day}`

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(seg)
    })

    return groups
  }

  const groupedEntries = groupEntriesByDay(filteredEntries)
  const sortedGroupKeys = Object.keys(groupedEntries).sort()

  const startDrag = (
    e: React.MouseEvent,
    entry: Entry,
    type: 'move' | 'resizeTop' | 'resizeBottom'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    setDragState({
      id: entry.id,
      type,
      originalStart: entry.startTime,
      originalEnd: entry.endTime,
      startClientY: e.clientY,
    })
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
    deleteEntry(id).catch((err) => console.error('[entries] delete failed:', err))
    if (dragState && dragState.id === id) setDragState(null)
    if (selectedId === id) setSelectedId(null)
  }

  useEffect(() => {
    if (!dragState) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaY = event.clientY - dragState.startClientY
      const deltaMinutes = Math.round(deltaY / MINUTE_HEIGHT / 15) * 15

      if (deltaMinutes === 0) {
        return
      }

      setEntries((prev) => {
        const minuteMs = 60 * 1000

        const updated = prev.map((entry) => {
          if (entry.id !== dragState.id) {
            return entry
          }

          const originalStartDate = new Date(dragState.originalStart)
          const originalEndDate = new Date(dragState.originalEnd)

          let newEntry = entry

          if (dragState.type === 'move') {
            const newStart = new Date(originalStartDate.getTime() + deltaMinutes * minuteMs)
            const newEnd = new Date(originalEndDate.getTime() + deltaMinutes * minuteMs)
            newEntry = { ...entry, startTime: newStart.toISOString(), endTime: newEnd.toISOString() }
          } else if (dragState.type === 'resizeTop') {
            let newStart = new Date(originalStartDate.getTime() + deltaMinutes * minuteMs)
            const minStart = new Date(originalEndDate.getTime() - 5 * minuteMs)
            if (newStart > minStart) newStart = minStart
            newEntry = { ...entry, startTime: newStart.toISOString() }
          } else if (dragState.type === 'resizeBottom') {
            let newEnd = new Date(originalEndDate.getTime() + deltaMinutes * minuteMs)
            const minEnd = new Date(originalStartDate.getTime() + 5 * minuteMs)
            if (newEnd < minEnd) newEnd = minEnd
            newEntry = { ...entry, endTime: newEnd.toISOString() }
          }

          // Track the latest dragged state so mouseup can persist it.
          draggedFinalRef.current = newEntry
          return newEntry
        })

        return updated
      })
    }

    const handleMouseUp = () => {
      // Persist the final dragged position to Supabase once on release.
      const dragged = draggedFinalRef.current
      if (dragged) {
        updateEntry(dragged.id, { startTime: dragged.startTime, endTime: dragged.endTime })
          .catch((err) => console.error('[entries] drag save failed:', err))
        draggedFinalRef.current = null
      }
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, MINUTE_HEIGHT])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!selectedId) return

      const idToDelete = selectedId
      setEntries((prev) => prev.filter((entry) => entry.id !== idToDelete))
      deleteEntry(idToDelete).catch((err) => console.error('[entries] keyboard delete failed:', err))
      if (dragState?.id === idToDelete) setDragState(null)
      setSelectedId(null)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, dragState])

  const TimelineControls = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex border border-blue-900 rounded-lg overflow-hidden self-start">
        <RippleButton
          rippleColor="rgba(255,255,255,0.6)"
          onClick={() => setViewMode('day')}
          className={`bg-blue-950 border-0 rounded-none transition-all duration-300 ${
            viewMode === 'day' ? 'text-white' : 'text-blue-300'
          }`}
        >
          Day
        </RippleButton>
        <RippleButton
          rippleColor="rgba(255,255,255,0.6)"
          onClick={() => setViewMode('week')}
          className={`bg-blue-950 border-0 rounded-none transition-all duration-300 ${
            viewMode === 'week' ? 'text-white' : 'text-blue-300'
          }`}
        >
          Week
        </RippleButton>
        <RippleButton
          rippleColor="rgba(255,255,255,0.6)"
          onClick={() => setViewMode('month')}
          className={`bg-blue-950 border-0 rounded-none transition-all duration-300 ${
            viewMode === 'month' ? 'text-white' : 'text-blue-300'
          }`}
        >
          Month
        </RippleButton>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <RippleButton
          rippleColor="rgba(255,255,255,0.6)"
          onClick={handlePrev}
          className="bg-blue-950 text-blue-300 border-blue-900 transition-all duration-300"
        >
          ‹ Prev
        </RippleButton>
        <span className="font-medium text-gray-300 text-sm truncate max-w-[180px] sm:max-w-none">{formatRangeLabel()}</span>
        <RippleButton
          rippleColor="rgba(255,255,255,0.6)"
          onClick={handleNext}
          className="bg-blue-950 text-blue-300 border-blue-900 transition-all duration-300"
        >
          Next ›
        </RippleButton>
      </div>
    </div>
  )

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Timeline</h1>
        <p className="text-gray-500">No activities logged yet.</p>
      </div>
    )
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6">
        <h1 className="text-3xl font-bold mb-4 text-blue-600">Timeline</h1>
        <TimelineControls />
        <p className="text-gray-500">No entries for this period.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6" onClick={() => setSelectedId(null)}>
      <h1 className="text-3xl font-bold mb-4 text-blue-600">Timeline</h1>
      <TimelineControls />

      <div className="space-y-4">
        {viewMode === 'day' ? (
          (() => {
            const HOUR_HEIGHT = 60 * MINUTE_HEIGHT
            const TOTAL_HEIGHT = 24 * HOUR_HEIGHT

            const formatHourLabel = (hour: number) => {
              const period = hour >= 12 ? 'PM' : 'AM'
              const hour12 = hour % 12 === 0 ? 12 : hour % 12
              return `${hour12} ${period}`
            }

            return (
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded">
                <div className="flex">
                  <div className="w-16 shrink-0 border-r border-white/10">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="relative text-xs text-gray-400 pr-2 text-right"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <div className="absolute -top-2 right-2">{formatHourLabel(hour)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-gray-200"
                        style={{ top: `${hour * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {(() => {
                      const dayKey = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-${String(rangeStart.getDate()).padStart(2, '0')}`
                      const daySegs = groupedEntries[dayKey] || []
                      return computeOverlapLayout(daySegs).map(({ entry: seg, col, totalCols }, index) => {
                        const duration = getDuration(seg.startTime, seg.endTime)
                        const height = Math.max(duration * MINUTE_HEIGHT, 24)
                        const bgColor = resolveColor(seg.activity, activityColors)

                        const start = new Date(seg.startTime)
                        const startMinutes = (start.getTime() - rangeStart.getTime()) / (1000 * 60)
                        const top = Math.max(0, Math.min(startMinutes, 24 * 60)) * MINUTE_HEIGHT

                        const pct = 100 / totalCols

                        return (
                          <div
                            key={`${seg.id}-${seg.startTime}`}
                            className={`group absolute border rounded px-3 py-2 overflow-hidden cursor-move transition-shadow ${selectedId === seg.id ? 'border-blue-400 ring-2 ring-blue-400' : 'border-gray-300'}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              left: `calc(${col * pct}% + 4px)`,
                              width: `calc(${pct}% - 8px)`,
                              zIndex: index + 1,
                              backgroundColor: bgColor,
                            }}
                            onMouseDown={(e) => startDrag(e, seg, 'move')}
                            onClick={(e) => { e.stopPropagation(); setSelectedId(seg.id) }}
                          >
                            <div
                              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
                              onMouseDown={(e) => startDrag(e, seg, 'resizeTop')}
                            />
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
                              onMouseDown={(e) => startDrag(e, seg, 'resizeBottom')}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, seg.id)}
                              className="absolute top-1 right-1 text-xs text-gray-600 hover:text-red-600 hidden group-hover:inline"
                            >
                              ×
                            </button>
                            <div className="font-semibold text-sm text-gray-800">{seg.activity}</div>
                            <div className="text-xs text-gray-600">
                              {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            )
          })()
        ) : viewMode === 'week' ? (
          (() => {
            const HOUR_HEIGHT = 60 * MINUTE_HEIGHT
            const TOTAL_HEIGHT = 24 * HOUR_HEIGHT

            const formatHourLabel = (hour: number) => {
              const period = hour >= 12 ? 'PM' : 'AM'
              const hour12 = hour % 12 === 0 ? 12 : hour % 12
              return `${hour12} ${period}`
            }

            const weekDays: Date[] = Array.from({ length: 7 }).map((_, index) => {
              const d = new Date(rangeStart)
              d.setDate(d.getDate() + index)
              return d
            })

            const getDayKey = (date: Date) => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }

            const formatDayHeader = (date: Date) =>
              date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })

            return (
              <div className="overflow-x-auto">
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded min-w-[560px]">
                <div className="flex border-b border-white/10 bg-white/5 text-xs text-gray-400">
                  <div className="w-16 shrink-0" />
                  <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((date, index) => (
                      <div key={index} className="py-2 text-center border-l border-white/10 first:border-l-0">
                        {formatDayHeader(date)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-16 shrink-0 border-r border-white/10">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="relative text-xs text-gray-400 pr-2 text-right"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <div className="absolute -top-2 right-2">{formatHourLabel(hour)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-gray-200"
                        style={{ top: `${hour * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    <div className="absolute inset-0 flex">
                      {weekDays.map((dayDate, dayIndex) => {
                        const dayKey = getDayKey(dayDate)
                        const dayEntries = groupedEntries[dayKey] || []

                        return (
                          <div
                            key={dayIndex}
                            className="flex-1 border-l border-white/10 first:border-l-0 relative"
                          >
                            {computeOverlapLayout(dayEntries).map(({ entry: seg, col, totalCols }, index) => {
                              const duration = getDuration(seg.startTime, seg.endTime)
                              const height = Math.max(duration * MINUTE_HEIGHT, 24)
                              const bgColor = resolveColor(seg.activity, activityColors)

                              const start = new Date(seg.startTime)
                              const dayStart = new Date(dayDate)
                              dayStart.setHours(0, 0, 0, 0)
                              const startMinutes =
                                (start.getTime() - dayStart.getTime()) / (1000 * 60)
                              const top =
                                Math.max(0, Math.min(startMinutes, 24 * 60)) * MINUTE_HEIGHT

                              const pct = 100 / totalCols

                              return (
                                <div
                                  key={`${seg.id}-${seg.startTime}`}
                                  className={`group absolute border rounded px-2 py-1 overflow-hidden cursor-move transition-shadow ${selectedId === seg.id ? 'border-blue-400 ring-2 ring-blue-400' : 'border-gray-300'}`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    left: `calc(${col * pct}% + 2px)`,
                                    width: `calc(${pct}% - 4px)`,
                                    zIndex: index + 1,
                                    backgroundColor: bgColor,
                                  }}
                                  onMouseDown={(e) => startDrag(e, seg, 'move')}
                                  onClick={(e) => { e.stopPropagation(); setSelectedId(seg.id) }}
                                >
                                  <div
                                    className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
                                    onMouseDown={(e) => startDrag(e, seg, 'resizeTop')}
                                  />
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
                                    onMouseDown={(e) => startDrag(e, seg, 'resizeBottom')}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, seg.id)}
                                    className="absolute top-1 right-1 text-xs text-gray-600 hover:text-red-600 hidden group-hover:inline"
                                  >
                                    ×
                                  </button>
                                  <div className="font-semibold text-xs truncate text-gray-800">
                                    {seg.activity}
                                  </div>
                                  <div className="text-[10px] text-gray-600">
                                    {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )
          })()
        ) : (
          (() => {
            const year = rangeStart.getFullYear()
            const month = rangeStart.getMonth()

            const firstOfMonth = new Date(year, month, 1)
            const startWeekday = firstOfMonth.getDay() // 0 = Sunday
            const daysInMonth = new Date(year, month + 1, 0).getDate()

            const cells: (Date | null)[] = []

            for (let i = 0; i < startWeekday; i += 1) {
              cells.push(null)
            }

            for (let day = 1; day <= daysInMonth; day += 1) {
              cells.push(new Date(year, month, day))
            }

            while (cells.length % 7 !== 0) {
              cells.push(null)
            }

            const getDayKey = (date: Date) => {
              const dYear = date.getFullYear()
              const dMonth = String(date.getMonth() + 1).padStart(2, '0')
              const dDay = String(date.getDate()).padStart(2, '0')
              return `${dYear}-${dMonth}-${dDay}`
            }

            const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

            return (
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded overflow-hidden">
                <div className="grid grid-cols-7 border-b border-white/10 bg-white/5 text-xs text-center text-gray-400">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="py-2">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-white/10">
                  {cells.map((cellDate, index) => {
                    if (!cellDate) {
                      return (
                        <div key={index} className="min-h-[48px] sm:min-h-[80px] bg-slate-900/60" />
                      )
                    }

                    const dayKey = getDayKey(cellDate)
                    const dayEntries = groupedEntries[dayKey] || []

                    return (
                      <div
                        key={index}
                        className="min-h-[48px] sm:min-h-[80px] bg-slate-900/60 p-1 sm:p-2 align-top"
                      >
                        <div className="text-xs font-semibold text-gray-300">
                          {cellDate.getDate()}
                        </div>
                        <div className="mt-1 space-y-1">
                          {dayEntries.map((seg) => {
                            const bgColor = resolveColor(seg.activity, activityColors)

                            return (
                              <div
                                key={`${seg.id}-${seg.startTime}`}
                                className={`group border rounded px-1 py-0.5 relative transition-shadow ${selectedId === seg.id ? 'border-blue-400 ring-2 ring-blue-400' : 'border-gray-300'}`}
                                style={{ backgroundColor: bgColor }}
                                onClick={(e) => { e.stopPropagation(); setSelectedId(seg.id) }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(e, seg.id)}
                                  className="absolute top-0.5 right-0.5 text-[10px] text-gray-600 hover:text-red-600 hidden group-hover:inline"
                                >
                                  ×
                                </button>
                                <div className="text-[11px] font-medium truncate text-gray-800">
                                  {seg.activity}
                                </div>
                                <div className="text-[10px] text-gray-600 truncate">
                                  {formatTime(seg.startTime)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}
