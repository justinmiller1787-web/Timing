import type { Activity } from './types'

const ACTIVITIES_KEY = 'activities'

const DEFAULT_ACTIVITIES: Activity[] = [
  'Sleep',
  'Classes',
  'Studying',
  'Gym',
  'Work',
  'Social',
  'Scrolling',
  'Other',
]

export function getActivities(): Activity[] {
  if (typeof window === 'undefined') {
    return DEFAULT_ACTIVITIES
  }

  const stored = window.localStorage.getItem(ACTIVITIES_KEY)

  if (!stored) {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(DEFAULT_ACTIVITIES))
    return DEFAULT_ACTIVITIES
  }

  try {
    const parsed = JSON.parse(stored) as Activity[]

    if (Array.isArray(parsed)) {
      return parsed
    }

    return DEFAULT_ACTIVITIES
  } catch {
    return DEFAULT_ACTIVITIES
  }
}

export function addActivity(name: string): Activity[] {
  const trimmed = name.trim()

  if (!trimmed) {
    return getActivities()
  }

  const current = getActivities()

  if (current.includes(trimmed)) {
    return current
  }

  const updated = [...current, trimmed]

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updated))
  }

  return updated
}

export function removeActivity(name: string): Activity[] {
  const current = getActivities()
  const updated = current.filter((activity) => activity !== name)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updated))
  }

  return updated
}

// ── Activity colors ───────────────────────────────────────────────────────────

const COLORS_KEY = 'activityColors'

export function getActivityColors(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const stored = window.localStorage.getItem(COLORS_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as Record<string, string>
  } catch {
    return {}
  }
}

export function setActivityColors(colors: Record<string, string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COLORS_KEY, JSON.stringify(colors))
}

// ─────────────────────────────────────────────────────────────────────────────

export function renameActivity(oldName: string, newName: string): Activity[] {
  const trimmed = newName.trim()

  if (!trimmed || trimmed === oldName) {
    return getActivities()
  }

  const current = getActivities()

  if (current.includes(trimmed)) {
    return current
  }

  const updated = current.map((activity) => (activity === oldName ? trimmed : activity))

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updated))
  }

  return updated
}

