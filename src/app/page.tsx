'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getActivities } from '@/lib/storage'

const MANAGE_VALUE = '__manage__'

export default function LogPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<string[]>([])
  const [activity, setActivity] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    setActivities(getActivities())
  }, [])

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    if (value === MANAGE_VALUE) {
      router.push('/activities')
      return
    }

    setActivity(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activity || !startTime || !endTime) {
      return
    }

    const entry = {
      id: Date.now().toString(),
      activity,
      startTime,
      endTime,
    }

    const existing = localStorage.getItem('timingEntries')
    const entries = existing ? JSON.parse(existing) : []
    entries.push(entry)
    localStorage.setItem('timingEntries', JSON.stringify(entries))

    setActivity('')
    setStartTime('')
    setEndTime('')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Log Activity</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Activity</label>
          <select
            value={activity}
            onChange={handleActivityChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select an activity</option>
            {activities.length === 0 ? (
              <option value="" disabled>
                No activities yet
              </option>
            ) : (
              activities.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))
            )}
            <option value={MANAGE_VALUE}>Manage activities</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </form>
    </div>
  )
}
