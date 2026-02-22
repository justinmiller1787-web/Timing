'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from 'react-datepicker'
import { getActivities } from '@/lib/storage'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { GlassSelect } from '@/components/ui/glass-select'

const MANAGE_VALUE = '__manage__'

export default function LogPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<string[]>([])
  const [activity, setActivity] = useState('')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)

  const [submitted, setSubmitted] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [progress, setProgress] = useState(0)
  const duration = 1000

  useEffect(() => {
    setActivities(getActivities())
  }, [])

  useEffect(() => {
    if (!submitted) return

    setProgress(0)
    const animStartTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - animStartTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)

      if (elapsed >= duration) {
        clearInterval(interval)
        // Show "Submitted" only after the progress bar has fully filled
        setShowConfirmation(true)
        setTimeout(() => {
          setShowConfirmation(false)
          setTimeout(() => {
            setSubmitted(false)
            setProgress(0)
          }, 400)
        }, 1500)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [submitted])

  const handleActivityChange = (value: string) => {
    if (value === MANAGE_VALUE) {
      router.push('/activities')
      return
    }
    setActivity(value)
  }

  const handleSave = async () => {
    if (!activity || !startTime || !endTime) {
      return
    }

    const entry = {
      id: Date.now().toString(),
      activity,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }

    const existing = localStorage.getItem('timingEntries')
    const entries = existing ? JSON.parse(existing) : []
    entries.push(entry)
    localStorage.setItem('timingEntries', JSON.stringify(entries))

    setActivity('')
    setStartTime(null)
    setEndTime(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <LiquidGlass className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold font-semibold mb-6 text-blue-600">Log Activity</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-blue-500">Activity</label>
            <LiquidGlass compact className="rounded-xl">
              <GlassSelect
                value={activity}
                onChange={handleActivityChange}
                placeholder="Select an activity"
                options={[
                  ...(activities.length === 0
                    ? [{ value: "__none__", label: "No activities yet", disabled: true }]
                    : activities.map((act) => ({ value: act, label: act }))),
                  { value: "", label: "", separator: true },
                  { value: MANAGE_VALUE, label: "Manage activities" },
                ]}
              />
            </LiquidGlass>
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-semibold mb-2 text-blue-500">Start Time</label>
            <LiquidGlass compact className="rounded-xl">
              <DatePicker
                selected={startTime}
                onChange={(date: Date | null) => setStartTime(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat="MM/dd/yyyy h:mm aa"
                className="w-full px-4 py-2 bg-transparent border-0 border-transparent rounded-md focus:ring-1 focus:ring-white/30 focus:outline-none"
                wrapperClassName="w-full"
                required
                placeholderText="Select start time"
                popperClassName="z-[9999]"
                popperProps={{ strategy: "fixed" }}
                portalId="root-portal"
                withPortal
              />
            </LiquidGlass>
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-semibold mb-2 text-blue-500">End Time</label>
            <LiquidGlass compact className="rounded-xl">
              <DatePicker
                selected={endTime}
                onChange={(date: Date | null) => setEndTime(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat="MM/dd/yyyy h:mm aa"
                className="w-full px-4 py-2 bg-transparent border-0 border-transparent rounded-md focus:ring-1 focus:ring-white/30 focus:outline-none"
                wrapperClassName="w-full"
                required
                placeholderText="Select end time"
                popperClassName="z-[9999]"
                popperProps={{ strategy: "fixed" }}
                portalId="root-portal"
                withPortal
              />
            </LiquidGlass>
          </div>

          <div className="relative overflow-hidden rounded-xl h-12 min-w-[140px]">
            {/* Progress Background */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-blue-800"
              style={{
                width: `${progress}%`,
                opacity: submitted ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* Original Save Button */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-xl active:scale-95 cursor-pointer"
              style={{
                opacity: submitted ? 0 : 1,
                filter: submitted ? "blur(8px)" : "blur(0px)",
                transform: submitted ? "scale(0.95)" : "scale(1)",
                transition: "opacity 600ms ease, filter 600ms ease, transform 600ms ease, background-color 200ms ease",
                pointerEvents: submitted ? "none" : "auto",
                zIndex: 20,
              }}
              onClick={async () => {
                if (submitted) return
                await handleSave()
                setSubmitted(true)
              }}
            >
              Save
            </div>

            {/* Submitted Confirmation */}
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 bg-blue-700 text-white font-semibold rounded-xl"
              style={{
                opacity: showConfirmation ? 1 : 0,
                filter: showConfirmation ? "blur(0px)" : "blur(8px)",
                transform: showConfirmation ? "scale(1)" : "scale(1.05)",
                transition: "all 0.4s ease",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: showConfirmation ? 0 : 24,
                    transition: "stroke-dashoffset 0.4s ease 0.1s",
                  }}
                />
              </svg>
              Submitted
            </div>
          </div>
        </form>
      </LiquidGlass>
    </div>
  )
}
