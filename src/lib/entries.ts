import { supabase } from './supabase'

// ── Shared Entry type ─────────────────────────────────────────────────────────

export interface Entry {
  id: string
  activity: string
  startTime: string // ISO 8601
  endTime: string   // ISO 8601
}

// ── DB row → Entry ────────────────────────────────────────────────────────────

interface DbRow {
  id: string
  activity: string
  start_time: string
  end_time: string
}

function rowToEntry(row: DbRow): Entry {
  return {
    id: row.id,
    activity: row.activity,
    startTime: row.start_time,
    endTime: row.end_time,
  }
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getEntries(): Promise<Entry[]> {
  const userId = await getUserId()

  const { data, error } = await supabase
    .from('entries')
    .select('id, activity, start_time, end_time')
    .eq('user_id', userId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('[entries] getEntries error:', error.message)
    return []
  }

  return (data as DbRow[]).map(rowToEntry)
}

export async function addEntry(entry: Entry): Promise<void> {
  const userId = await getUserId()

  const { error } = await supabase.from('entries').insert({
    id: entry.id,
    activity: entry.activity,
    start_time: entry.startTime,
    end_time: entry.endTime,
    user_id: userId,
  })

  if (error) {
    console.error('[entries] addEntry error:', error.message)
    throw error
  }
}

export async function updateEntry(
  id: string,
  changes: Partial<Pick<Entry, 'activity' | 'startTime' | 'endTime'>>
): Promise<void> {
  const dbChanges: Record<string, string> = {}
  if (changes.startTime !== undefined) dbChanges.start_time = changes.startTime
  if (changes.endTime !== undefined) dbChanges.end_time = changes.endTime
  if (changes.activity !== undefined) dbChanges.activity = changes.activity

  const { error } = await supabase.from('entries').update(dbChanges).eq('id', id)

  if (error) {
    console.error('[entries] updateEntry error:', error.message)
    throw error
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id)

  if (error) {
    console.error('[entries] deleteEntry error:', error.message)
    throw error
  }
}
