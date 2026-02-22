'use client'

import { useState, useEffect } from 'react'
import { RippleButton } from '@/components/ui/ripple-button'

interface Entry {
  id: string
  activity: string
  startTime: string
  endTime: string
}

const ACTIVITY_COLORS: Record<string, string> = {
  Sleep: 'bg-blue-200',
  Classes: 'bg-purple-200',
  Studying: 'bg-green-200',
  Gym: 'bg-red-200',
  Work: 'bg-yellow-200',
  Social: 'bg-pink-200',
  Scrolling: 'bg-gray-200',
  Other: 'bg-orange-200',
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<Entry[]>([])
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

  useEffect(() => {
    const stored = localStorage.getItem('timingEntries')
    if (stored) {
      const parsed = JSON.parse(stored)
      const sorted = parsed.sort((a: Entry, b: Entry) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      setEntries(sorted)
    }
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

  const filteredEntries = entries.filter((entry) => {
    const entryStart = new Date(entry.startTime)
    return entryStart >= rangeStart && entryStart < rangeEnd
  })

  const groupEntriesByDay = (list: Entry[]) => {
    const groups: Record<string, Entry[]> = {}

    list.forEach((entry) => {
      const date = new Date(entry.startTime)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const key = `${year}-${month}-${day}`

      if (!groups[key]) {
        groups[key] = []
      }

      groups[key].push(entry)
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

    setEntries((prev) => {
      const updated = prev.filter((entry) => entry.id !== id)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('timingEntries', JSON.stringify(updated))
      }

      return updated
    })

    if (dragState && dragState.id === id) {
      setDragState(null)
    }
  }

  useEffect(() => {
    if (!dragState) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const deltaY = event.clientY - dragState.startClientY
      const deltaMinutes = Math.round(deltaY / MINUTE_HEIGHT)

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

          if (dragState.type === 'move') {
            const newStart = new Date(originalStartDate.getTime() + deltaMinutes * minuteMs)
            const newEnd = new Date(originalEndDate.getTime() + deltaMinutes * minuteMs)

            return {
              ...entry,
              startTime: newStart.toISOString(),
              endTime: newEnd.toISOString(),
            }
          }

          if (dragState.type === 'resizeTop') {
            let newStart = new Date(originalStartDate.getTime() + deltaMinutes * minuteMs)
            const minStart = new Date(originalEndDate.getTime() - 5 * minuteMs)

            if (newStart > minStart) {
              newStart = minStart
            }

            return {
              ...entry,
              startTime: newStart.toISOString(),
            }
          }

          if (dragState.type === 'resizeBottom') {
            let newEnd = new Date(originalEndDate.getTime() + deltaMinutes * minuteMs)
            const minEnd = new Date(originalStartDate.getTime() + 5 * minuteMs)

            if (newEnd < minEnd) {
              newEnd = minEnd
            }

            return {
              ...entry,
              endTime: newEnd.toISOString(),
            }
          }

          return entry
        })

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('timingEntries', JSON.stringify(updated))
        }

        return updated
      })
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, MINUTE_HEIGHT])

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
    <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6">
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

                    {filteredEntries.map((entry, index) => {
                      const duration = getDuration(entry.startTime, entry.endTime)
                      const height = Math.max(duration * MINUTE_HEIGHT, 24)
                      const color = ACTIVITY_COLORS[entry.activity] || 'bg-gray-200'

                      const start = new Date(entry.startTime)
                      const startMinutes = (start.getTime() - rangeStart.getTime()) / (1000 * 60)
                      const top = Math.max(0, Math.min(startMinutes, 24 * 60)) * MINUTE_HEIGHT

                      return (
                        <div
                          key={entry.id}
                          className={`group ${color} absolute left-2 right-2 border border-gray-300 rounded px-3 py-2 overflow-hidden cursor-move`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            zIndex: index + 1,
                          }}
                          onMouseDown={(e) => startDrag(e, entry, 'move')}
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
                            onMouseDown={(e) => startDrag(e, entry, 'resizeTop')}
                          />
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
                            onMouseDown={(e) => startDrag(e, entry, 'resizeBottom')}
                          />
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, entry.id)}
                            className="absolute top-1 right-1 text-xs text-gray-600 hover:text-red-600 hidden group-hover:inline"
                          >
                            ×
                          </button>
                          <div className="font-semibold text-sm">{entry.activity}</div>
                          <div className="text-xs text-gray-600">
                            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </div>
                        </div>
                      )
                    })}
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
                            {dayEntries.map((entry, index) => {
                              const duration = getDuration(entry.startTime, entry.endTime)
                              const height = Math.max(duration * MINUTE_HEIGHT, 24)
                              const color = ACTIVITY_COLORS[entry.activity] || 'bg-gray-200'

                              const start = new Date(entry.startTime)
                              const dayStart = new Date(dayDate)
                              dayStart.setHours(0, 0, 0, 0)
                              const startMinutes =
                                (start.getTime() - dayStart.getTime()) / (1000 * 60)
                              const top =
                                Math.max(0, Math.min(startMinutes, 24 * 60)) * MINUTE_HEIGHT

                              return (
                                <div
                                  key={entry.id}
                                  className={`group ${color} absolute left-1 right-1 border border-gray-300 rounded px-2 py-1 overflow-hidden cursor-move`}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: index + 1,
                                  }}
                                  onMouseDown={(e) => startDrag(e, entry, 'move')}
                                >
                                  <div
                                    className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
                                    onMouseDown={(e) => startDrag(e, entry, 'resizeTop')}
                                  />
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
                                    onMouseDown={(e) => startDrag(e, entry, 'resizeBottom')}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, entry.id)}
                                    className="absolute top-1 right-1 text-xs text-gray-600 hover:text-red-600 hidden group-hover:inline"
                                  >
                                    ×
                                  </button>
                                  <div className="font-semibold text-xs truncate">
                                    {entry.activity}
                                  </div>
                                  <div className="text-[10px] text-gray-600">
                                    {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
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
                          {dayEntries.map((entry) => {
                            const color = ACTIVITY_COLORS[entry.activity] || 'bg-gray-200'

                            return (
                              <div
                                key={entry.id}
                                className={`group ${color} border border-gray-300 rounded px-1 py-0.5 relative`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(e, entry.id)}
                                  className="absolute top-0.5 right-0.5 text-[10px] text-gray-600 hover:text-red-600 hidden group-hover:inline"
                                >
                                  ×
                                </button>
                                <div className="text-[11px] font-medium truncate">
                                  {entry.activity}
                                </div>
                                <div className="text-[10px] text-gray-600 truncate">
                                  {formatTime(entry.startTime)}
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
