'use client'

import { useEffect, useState } from 'react'
import type { Activity } from '@/lib/types'
import { getActivities, addActivity, removeActivity } from '@/lib/storage'
import { LiquidGlass } from '@/components/ui/liquid-glass'

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [newActivity, setNewActivity] = useState('')

  useEffect(() => {
    setActivities(getActivities())
  }, [])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()

    const updated = addActivity(newActivity)
    setActivities(updated)
    setNewActivity('')
  }

  const handleRemove = (name: Activity) => {
    const updated = removeActivity(name)
    setActivities(updated)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:p-6">
      <h1 className="text-3xl font-bold mb-6">Activities</h1>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-6">
        <LiquidGlass compact className="rounded-xl flex-1">
          <input
            type="text"
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="New activity name"
            className="w-full px-3 py-2 bg-transparent border-0 border-transparent rounded text-white placeholder-gray-400 focus:ring-1 focus:ring-white/30 focus:outline-none"
          />
        </LiquidGlass>
        <LiquidGlass compact className="rounded-xl sm:w-auto w-full">
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-transparent text-white rounded hover:bg-white/10 transition-colors shadow-none"
          >
            Add
          </button>
        </LiquidGlass>
      </form>

      {activities.length === 0 ? (
        <p className="text-gray-500">No activities yet.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li
              key={activity}
              className="flex items-center justify-between gap-2 px-3 py-2 border border-white/20 rounded bg-white/5"
            >
              <span className="truncate text-gray-200">{activity}</span>
              <button
                type="button"
                onClick={() => handleRemove(activity)}
                className="text-red-400 hover:text-red-300 text-sm shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

