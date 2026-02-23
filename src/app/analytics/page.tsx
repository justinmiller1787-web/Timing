'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { RippleButton } from '@/components/ui/ripple-button'
import { getActivityColors } from '@/lib/storage'
import { resolveColor } from '@/lib/colors'
import { getEntries } from '@/lib/entries'
import type { Entry } from '@/lib/entries'

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function AnalyticsPage() {
  const [data, setData] = useState<{ name: string; value: number; percentage: number }[]>([])
  const [activityColors, setActivityColors] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  const getRange = (mode: 'day' | 'week' | 'month', date: Date) => {
    const start = new Date(date)

    if (mode === 'day') {
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { start, end }
    }

    if (mode === 'week') {
      const day = start.getDay()
      const diff = (day + 6) % 7
      start.setDate(start.getDate() - diff)
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

  useEffect(() => {
    let cancelled = false

    getEntries().then((allEntries) => {
      if (cancelled) return

      const { start: rangeStart, end: rangeEnd } = getRange(viewMode, currentDate)

      const filteredEntries = allEntries.filter((entry: Entry) => {
        const entryStart = new Date(entry.startTime)
        return entryStart >= rangeStart && entryStart < rangeEnd
      })

      if (filteredEntries.length === 0) {
        setData([])
        return
      }

      const totals: Record<string, number> = {}

      filteredEntries.forEach((entry: Entry) => {
        const minutes =
          (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)
        totals[entry.activity] = (totals[entry.activity] ?? 0) + minutes
      })

      const totalMinutes = Object.values(totals).reduce((sum, val) => sum + val, 0)

      const chartData = Object.entries(totals)
        .map(([name, value]) => ({
          name,
          value: Math.round(value),
          percentage: totalMinutes > 0 ? Math.round((value / totalMinutes) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)

      setData(chartData)
      setActivityColors(getActivityColors())
    })

    return () => { cancelled = true }
  }, [viewMode, currentDate])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">Analytics</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex border border-blue-900 rounded-lg overflow-hidden self-start">
          <RippleButton
            rippleColor="#1e3a8a"
            onClick={() => setViewMode('day')}
            className={`bg-blue-950 border-0 rounded-none transition-all duration-300 ${
              viewMode === 'day' ? 'text-white' : 'text-blue-300'
            }`}
          >
            Day
          </RippleButton>
          <RippleButton
            rippleColor="#1e3a8a"
            onClick={() => setViewMode('week')}
            className={`bg-blue-950 border-0 rounded-none transition-all duration-300 ${
              viewMode === 'week' ? 'text-white' : 'text-blue-300'
            }`}
          >
            Week
          </RippleButton>
          <RippleButton
            rippleColor="#1e3a8a"
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
            rippleColor="#1e3a8a"
            onClick={handlePrev}
            className="bg-blue-950 text-blue-300 border-blue-900 transition-all duration-300"
          >
            ‹ Prev
          </RippleButton>
          <span className="font-medium text-gray-300 text-sm truncate max-w-[180px] sm:max-w-none">{formatRangeLabel()}</span>
          <RippleButton
            rippleColor="#1e3a8a"
            onClick={handleNext}
            className="bg-blue-950 text-blue-300 border-blue-900 transition-all duration-300"
          >
            Next ›
          </RippleButton>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500">No data available for this period.</p>
      ) : (
        <>
          <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-lg">
            <div className="h-64 sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={resolveColor(entry.name, activityColors)} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: resolveColor(item.name, activityColors) }}
                  />
                  <span className="font-medium text-gray-200">{item.name}</span>
                </div>
                <span className="text-gray-400">
                  {formatDuration(item.value)} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
