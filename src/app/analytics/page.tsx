'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Entry {
  id: string
  activity: string
  startTime: string
  endTime: string
}

const ACTIVITY_COLORS: Record<string, string> = {
  Sleep: '#93c5fd',
  Classes: '#c4b5fd',
  Studying: '#86efac',
  Gym: '#fca5a5',
  Work: '#fde047',
  Social: '#f9a8d4',
  Scrolling: '#d1d5db',
  Other: '#fdba74',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<{ name: string; value: number; percentage: number }[]>([])
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
    const stored = localStorage.getItem('timingEntries')
    if (!stored) {
      setData([])
      return
    }

    const entries: Entry[] = JSON.parse(stored)
    const { start: rangeStart, end: rangeEnd } = getRange(viewMode, currentDate)

    const filteredEntries = entries.filter((entry) => {
      const entryStart = new Date(entry.startTime)
      return entryStart >= rangeStart && entryStart < rangeEnd
    })

    const totals: Record<string, number> = {}

    filteredEntries.forEach((entry) => {
      const startDate = new Date(entry.startTime)
      const endDate = new Date(entry.endTime)
      const minutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
      
      if (totals[entry.activity]) {
        totals[entry.activity] += minutes
      } else {
        totals[entry.activity] = minutes
      }
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
  }, [viewMode, currentDate])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Analytics</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded border text-sm ${
              viewMode === 'day' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded border text-sm ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded border text-sm ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="px-3 py-1 rounded border border-gray-300 text-sm bg-white text-gray-700"
          >
            ‹ Prev
          </button>
          <span className="font-medium text-gray-700">{formatRangeLabel()}</span>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1 rounded border border-gray-300 text-sm bg-white text-gray-700"
          >
            Next ›
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500">No data available for this period.</p>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={ACTIVITY_COLORS[entry.name] || '#d1d5db'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-600">
                  {item.value} minutes ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
