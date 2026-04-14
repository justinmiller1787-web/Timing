'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { getActivities } from '@/lib/storage'

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

function toTask(value: unknown): Task | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<Task> & { title?: unknown; completed?: unknown }
  if (typeof candidate.title !== 'string') return null
  return {
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title: candidate.title,
    type: candidate.type === 'recurring' ? 'recurring' : 'one-time',
    linkedActivityName:
      typeof candidate.linkedActivityName === 'string' && candidate.linkedActivityName.trim()
        ? candidate.linkedActivityName
        : 'Other',
    dueDate: typeof candidate.dueDate === 'string' ? candidate.dueDate : undefined,
    starred: Boolean(candidate.starred),
    completed: Boolean(candidate.completed),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    recurrence:
      candidate.recurrence && typeof candidate.recurrence === 'object'
        ? {
            type:
              candidate.recurrence.type === 'weekdays' || candidate.recurrence.type === 'custom'
                ? candidate.recurrence.type
                : 'daily',
            daysOfWeek: Array.isArray(candidate.recurrence.daysOfWeek)
              ? candidate.recurrence.daysOfWeek.filter((day) => typeof day === 'number')
              : undefined,
          }
        : undefined,
  }
}

function getTasks(): Task[] {
  if (typeof window === 'undefined') return []
  const stored = window.localStorage.getItem(TASKS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(toTask).filter((task): task is Task => task !== null)
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  window.dispatchEvent(new Event(TASKS_CHANGED))
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'one-time' | 'recurring'>('one-time')
  const [linkedActivityName, setLinkedActivityName] = useState('Other')
  const [dueDate, setDueDate] = useState('')
  const [starred, setStarred] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekdays' | 'custom'>('daily')
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  useEffect(() => {
    setTasks(getTasks())
    const sortedActivities = [...getActivities()].sort((a, b) => a.localeCompare(b))
    if (!sortedActivities.includes('Other')) sortedActivities.push('Other')
    setActivities(sortedActivities)

    const onExternalChange = () => setTasks(getTasks())
    window.addEventListener(TASKS_CHANGED, onExternalChange)
    window.addEventListener('storage', onExternalChange)
    return () => {
      window.removeEventListener(TASKS_CHANGED, onExternalChange)
      window.removeEventListener('storage', onExternalChange)
    }
  }, [])

  const activeTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks])
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks])

  const resetForm = () => {
    setTitle('')
    setType('one-time')
    setLinkedActivityName('Other')
    setDueDate('')
    setStarred(false)
    setRecurrenceType('daily')
    setRecurrenceDays([])
    setEditingTaskId(null)
  }

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(day)
        ? prev.filter((value) => value !== day)
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleAddTask = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const now = new Date().toISOString()

    const recurrence =
      type === 'recurring'
        ? {
            type: recurrenceType,
            daysOfWeek: recurrenceType === 'custom' ? recurrenceDays : undefined,
          }
        : undefined

    const updated =
      editingTaskId === null
        ? [
            ...tasks,
            {
              id: crypto.randomUUID(),
              title: trimmedTitle,
              type,
              linkedActivityName: linkedActivityName || 'Other',
              dueDate: dueDate || undefined,
              starred,
              completed: false,
              createdAt: now,
              updatedAt: now,
              recurrence,
            },
          ]
        : tasks.map((task) =>
            task.id === editingTaskId
              ? {
                  ...task,
                  title: trimmedTitle,
                  type,
                  linkedActivityName: linkedActivityName || 'Other',
                  dueDate: dueDate || undefined,
                  starred,
                  recurrence,
                  updatedAt: now,
                }
              : task
          )

    setTasks(updated)
    saveTasks(updated)
    resetForm()
  }

  const handleToggleComplete = (id: string) => {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
        : task
    )
    setTasks(updated)
    saveTasks(updated)
  }

  const handleDelete = (id: string) => {
    const updated = tasks.filter((task) => task.id !== id)
    setTasks(updated)
    saveTasks(updated)
    if (editingTaskId === id) {
      resetForm()
    }
  }

  const handleLogTime = (task: Task) => {
    const params = new URLSearchParams()
    params.set('activity', task.linkedActivityName || 'Other')
    params.set('taskId', task.id)
    router.push(`/?${params.toString()}`)
  }

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setTitle(task.title)
    setType(task.type)
    setLinkedActivityName(task.linkedActivityName || 'Other')
    setDueDate(task.dueDate ?? '')
    setStarred(task.starred)
    setRecurrenceType(task.recurrence?.type ?? 'daily')
    setRecurrenceDays(task.recurrence?.daysOfWeek ?? [])
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6">
      <LiquidGlass className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Tasks</h1>

        <form onSubmit={handleAddTask} className="space-y-3 mb-6">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New task title"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold mb-1 text-blue-500">Task Type</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as 'one-time' | 'recurring')}
                className="w-full rounded-xl border border-white/20 bg-blue-950/80 px-3 py-2 text-white [&>option]:bg-blue-950 [&>option]:text-white"
              >
                <option value="one-time">One-Time</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-blue-500">Linked Activity</label>
              <select
                value={linkedActivityName}
                onChange={(event) => setLinkedActivityName(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-blue-950/80 px-3 py-2 text-white [&>option]:bg-blue-950 [&>option]:text-white"
              >
                {activities.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
            <label className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white">
              <input
                type="checkbox"
                checked={starred}
                onChange={(event) => setStarred(event.target.checked)}
              />
              Starred
            </label>
          </div>
          {type === 'recurring' && (
            <div className="space-y-2 rounded-xl border border-white/20 bg-white/5 p-3">
              <select
                value={recurrenceType}
                onChange={(event) =>
                  setRecurrenceType(event.target.value as 'daily' | 'weekdays' | 'custom')
                }
                className="w-full rounded-lg border border-white/20 bg-blue-950/80 px-2 py-2 text-white [&>option]:bg-blue-950 [&>option]:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="custom">Custom weekdays</option>
              </select>
              {recurrenceType === 'custom' && (
                <div className="flex flex-wrap gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, dayIndex) => (
                    <button
                      key={`${label}-${dayIndex}`}
                      type="button"
                      onClick={() => toggleRecurrenceDay(dayIndex)}
                      className={`h-8 w-8 rounded text-xs border ${
                        recurrenceDays.includes(dayIndex)
                          ? 'bg-blue-700 border-blue-400 text-white'
                          : 'bg-transparent border-white/20 text-blue-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-white font-medium"
            >
              {editingTaskId ? 'Save' : 'Add'}
            </button>
            {editingTaskId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="space-y-2 mb-6">
          <h2 className="text-lg font-semibold text-blue-300">Tasks</h2>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-gray-400">No active tasks yet.</p>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 p-3"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleComplete(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">
                    {task.starred ? '★ ' : ''}
                    {task.title}
                  </div>
                  <div className="text-xs text-blue-100/80 truncate">
                    {task.type} • {task.linkedActivityName}
                    {task.dueDate ? ` • ${task.dueDate}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogTime(task)}
                  className="rounded-md border border-blue-400/30 bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-200 hover:bg-blue-600/40 hover:text-white"
                >
                  Log time
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(task)}
                  className="text-sm text-blue-300 hover:text-blue-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  className="text-sm text-red-300 hover:text-red-200"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-blue-300">Completed Tasks</h2>
          {completedTasks.length === 0 ? (
            <p className="text-sm text-gray-400">No completed tasks yet.</p>
          ) : (
            completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 p-3"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleComplete(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 line-through truncate">
                    {task.starred ? '★ ' : ''}
                    {task.title}
                  </div>
                  <div className="text-xs text-blue-100/80 truncate">
                    {task.type} • {task.linkedActivityName}
                    {task.dueDate ? ` • ${task.dueDate}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(task)}
                  className="text-sm text-blue-300 hover:text-blue-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  className="text-sm text-red-300 hover:text-red-200"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </section>
      </LiquidGlass>
    </div>
  )
}
