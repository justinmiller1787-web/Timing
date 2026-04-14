'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getActivities } from '@/lib/storage'
import { addEntry } from '@/lib/entries'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { GlassSelect } from '@/components/ui/glass-select'
import { GlassDateTimePicker } from '@/components/ui/glass-datetime-picker'
import { getTasks } from '@/lib/tasks'
import { setEntryTaskLink } from '@/lib/entry-task-links'

const MANAGE_VALUE = '__manage__'

export default function LogPage() {
  return (
    <Suspense>
      <LogPageContent />
    </Suspense>
  )
}

function LogPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<string[]>([])
  const [tasks, setTasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [activity, setActivity] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)

  const [submitted, setSubmitted] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [progress, setProgress] = useState(0)
  const duration = 1000

  useEffect(() => {
    const sorted = [...getActivities()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
    setActivities(sorted)
    setTasks(getTasks().map((task) => ({ id: task.id, title: task.title, completed: task.completed })))
  }, [])

  const lastAppliedParams = useRef('')

  useEffect(() => {
    const paramString = searchParams.toString()
    if (paramString === lastAppliedParams.current) return
    lastAppliedParams.current = paramString

    const prefilledActivity = searchParams.get('activity')
    const prefilledTaskId = searchParams.get('taskId')
    if (prefilledActivity) {
      setActivity(prefilledActivity)
    }
    if (prefilledTaskId) {
      setSelectedTaskId(prefilledTaskId)
    }
  }, [searchParams])

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
    if (!startTime || !endTime) {
      return
    }

    const entryId = crypto.randomUUID()

    await addEntry({
      id: entryId,
      activity: activity || 'Other',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    })

    if (selectedTaskId) {
      setEntryTaskLink(entryId, selectedTaskId)
    }

    setActivity('')
    setSelectedTaskId('')
    setStartTime(null)
    setEndTime(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6">
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
            <label className="block text-sm font-semibold mb-2 text-blue-500">Task (optional)</label>
            <LiquidGlass compact className="rounded-xl">
              <GlassSelect
                value={selectedTaskId}
                onChange={setSelectedTaskId}
                placeholder="No task selected"
                options={[
                  { value: '', label: 'No task selected' },
                  ...tasks.map((task) => ({
                    value: task.id,
                    label: task.completed ? `${task.title} (completed)` : task.title,
                  })),
                ]}
              />
            </LiquidGlass>
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-semibold mb-2 text-blue-500">Start Time</label>
            <LiquidGlass compact className="rounded-xl">
              <GlassDateTimePicker
                value={startTime}
                onChange={setStartTime}
                placeholder="Select start time"
              />
            </LiquidGlass>
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-semibold mb-2 text-blue-500">End Time</label>
            <LiquidGlass compact className="rounded-xl">
              <GlassDateTimePicker
                value={endTime}
                onChange={setEndTime}
                placeholder="Select end time"
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
