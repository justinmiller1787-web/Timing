'use client'

const ENTRY_TASK_LINKS_KEY = 'timing_entry_task_links'

type EntryTaskLinks = Record<string, string>

function getMap(): EntryTaskLinks {
  if (typeof window === 'undefined') return {}
  const stored = window.localStorage.getItem(ENTRY_TASK_LINKS_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as EntryTaskLinks
  } catch {
    return {}
  }
}

function saveMap(map: EntryTaskLinks) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ENTRY_TASK_LINKS_KEY, JSON.stringify(map))
}

export function setEntryTaskLink(entryId: string, taskId?: string) {
  const map = getMap()
  if (!taskId) {
    delete map[entryId]
    saveMap(map)
    return
  }
  map[entryId] = taskId
  saveMap(map)
}

export function getEntryTaskLink(entryId: string): string | undefined {
  return getMap()[entryId]
}
