'use client'

export type Task = {
  id: string
  title: string
  type: 'one-time' | 'recurring'
  linkedActivityName: string
  dueDate?: string
  starred: boolean
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string

  recurrence?: {
    type: 'daily' | 'weekdays' | 'custom'
    daysOfWeek?: number[]
  }

  lastCompletedDate?: string
}

const TASKS_KEY = 'timing_tasks'
const TASKS_CHANGED_EVENT = 'timing_tasks_changed'

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function isValidTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Task
  return typeof candidate.id === 'string' && typeof candidate.title === 'string'
}

function notifyTasksChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT))
}

function nextDateForRecurrence(task: Task, completedOn: Date): string | undefined {
  if (task.type !== 'recurring' || !task.recurrence) return task.dueDate

  const next = new Date(completedOn)
  next.setHours(0, 0, 0, 0)

  if (task.recurrence.type === 'daily') {
    next.setDate(next.getDate() + 1)
    return dateOnly(next)
  }

  if (task.recurrence.type === 'weekdays') {
    do {
      next.setDate(next.getDate() + 1)
    } while (next.getDay() === 0 || next.getDay() === 6)
    return dateOnly(next)
  }

  const days = task.recurrence.daysOfWeek ?? []
  if (days.length === 0) {
    next.setDate(next.getDate() + 1)
    return dateOnly(next)
  }

  const normalizedDays = [...new Set(days)].sort((a, b) => a - b)
  for (let i = 1; i <= 7; i += 1) {
    const candidate = new Date(next)
    candidate.setDate(candidate.getDate() + i)
    if (normalizedDays.includes(candidate.getDay())) {
      return dateOnly(candidate)
    }
  }

  next.setDate(next.getDate() + 1)
  return dateOnly(next)
}

function refreshRecurringTasks(tasks: Task[]): Task[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let changed = false

  const updated = tasks.map((task) => {
    if (task.type !== 'recurring' || !task.completed || !task.dueDate) {
      return task
    }

    const due = parseDateOnly(task.dueDate)
    if (due.getTime() <= today.getTime()) {
      changed = true
      return {
        ...task,
        completed: false,
        updatedAt: new Date().toISOString(),
      }
    }
    return task
  })

  if (changed && typeof window !== 'undefined') {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(updated))
  }

  return updated
}

export function getTasks(): Task[] {
  if (typeof window === 'undefined') {
    return []
  }

  const stored = window.localStorage.getItem(TASKS_KEY)
  if (!stored) {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify([]))
    return []
  }

  try {
    const parsed = JSON.parse(stored) as unknown[]
    const valid = Array.isArray(parsed) ? parsed.filter(isValidTask) : []
    return refreshRecurringTasks(valid)
  } catch {
    return []
  }
}

export function saveTasks(tasks: Task[]): Task[] {
  if (typeof window === 'undefined') {
    return tasks
  }
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  notifyTasksChanged()
  return tasks
}

export function addTask(
  taskInput: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { order?: number }
): Task {
  const current = getTasks()
  const now = new Date().toISOString()
  const nextOrder = typeof taskInput.order === 'number' ? taskInput.order : current.length
  const created: Task = {
    ...taskInput,
    id: crypto.randomUUID(),
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
    linkedActivityName: taskInput.linkedActivityName || 'Other',
  }
  saveTasks([...current, created])
  return created
}

export function updateTask(id: string, changes: Partial<Task>): Task | null {
  const current = getTasks()
  let updatedTask: Task | null = null
  const updated = current.map((task) => {
    if (task.id !== id) return task
    updatedTask = {
      ...task,
      ...changes,
      linkedActivityName: changes.linkedActivityName || task.linkedActivityName || 'Other',
      updatedAt: new Date().toISOString(),
    }
    return updatedTask
  })
  if (!updatedTask) return null
  saveTasks(updated)
  return updatedTask
}

export function deleteTask(id: string): Task[] {
  const updated = getTasks().filter((task) => task.id !== id)
  return saveTasks(updated)
}

export function completeTask(id: string): Task | null {
  const current = getTasks()
  const today = new Date()
  let completedTask: Task | null = null

  const updated = current.map((task) => {
    if (task.id !== id) return task

    if (task.type === 'recurring') {
      const nextDueDate = nextDateForRecurrence(task, today)
      completedTask = {
        ...task,
        completed: true,
        lastCompletedDate: dateOnly(today),
        dueDate: nextDueDate,
        updatedAt: new Date().toISOString(),
      }
      return completedTask
    }

    completedTask = {
      ...task,
      completed: true,
      lastCompletedDate: dateOnly(today),
      updatedAt: new Date().toISOString(),
    }
    return completedTask
  })

  if (!completedTask) return null
  saveTasks(updated)
  return completedTask
}

export function formatDueDateLabel(dueDate?: string): string {
  if (!dueDate) return 'No due date'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const date = parseDateOnly(dueDate)
  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (date.getTime() < today.getTime()) return 'Overdue'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function subscribeTasks(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener(TASKS_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(TASKS_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
