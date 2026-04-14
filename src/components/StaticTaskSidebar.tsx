'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Task = {
  id: string
  title: string
  type: 'one-time' | 'recurring'
  linkedActivityName: string
  dueDate?: string
  starred: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
  recurrence?: {
    type: 'daily' | 'weekdays' | 'custom'
    daysOfWeek?: number[]
  }
}

const TASKS_KEY = 'timing_tasks'
const TASKS_CHANGED = 'timing_tasks_changed'

function readTasks(): Task[] {
  if (typeof window === 'undefined') return []
  const stored = window.localStorage.getItem(TASKS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item: unknown): item is Task =>
        typeof item === 'object' && item !== null && typeof (item as Task).title === 'string'
    )
  } catch {
    return []
  }
}

function writeTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  window.dispatchEvent(new Event(TASKS_CHANGED))
}

function formatDueLabel(dueDate?: string): string | null {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = new Date(`${dueDate}T00:00:00`)
  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (date.getTime() < today.getTime()) return 'Overdue'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SidebarSection({
  heading,
  tasks,
  onComplete,
  onLogTime,
}: {
  heading: string
  tasks: Task[]
  onComplete: (id: string) => void
  onLogTime: (task: Task) => void
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-blue-200">{heading}</h2>
      {tasks.length === 0 ? (
        <p className="text-xs text-blue-200/50">No tasks</p>
      ) : (
        tasks.map((task) => {
          const due = formatDueLabel(task.dueDate)
          return (
            <div
              key={task.id}
              className="flex items-start gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => onComplete(task.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-blue-100/90 truncate">
                  {task.starred ? '★ ' : ''}
                  {task.title}
                </div>
                {due && (
                  <div className={`text-xs truncate ${due === 'Overdue' ? 'text-red-300' : 'text-blue-100/60'}`}>
                    {due}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onLogTime(task)}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-blue-400/30 bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-200 hover:bg-blue-600/40 hover:text-white"
                >
                  ▶ Log time
                </button>
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}

export function StaticTaskSidebar() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])

  const refresh = useCallback(() => setTasks(readTasks()), [])

  useEffect(() => {
    refresh()
    window.addEventListener(TASKS_CHANGED, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(TASKS_CHANGED, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  const oneTimeTasks = useMemo(
    () => tasks.filter((t) => !t.completed && t.type === 'one-time'),
    [tasks]
  )
  const recurringTasks = useMemo(
    () => tasks.filter((t) => !t.completed && t.type === 'recurring'),
    [tasks]
  )

  const handleComplete = (id: string) => {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, completed: true, updatedAt: new Date().toISOString() }
        : task
    )
    setTasks(updated)
    writeTasks(updated)
  }

  const handleLogTime = (task: Task) => {
    const params = new URLSearchParams()
    params.set('activity', task.linkedActivityName || 'Other')
    params.set('taskId', task.id)
    router.push(`/?${params.toString()}`)
  }

  return (
    <aside className="w-[300px] shrink-0 self-start rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur-md p-4 space-y-5">
      <SidebarSection heading="One-Time Tasks" tasks={oneTimeTasks} onComplete={handleComplete} onLogTime={handleLogTime} />
      <SidebarSection heading="Recurring Tasks" tasks={recurringTasks} onComplete={handleComplete} onLogTime={handleLogTime} />
    </aside>
  )
}
