'use client'

import { useEffect, useState } from 'react'
import type { Activity } from '@/lib/types'
import { getActivities, addActivity, removeActivity } from '@/lib/storage'

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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Activities</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newActivity}
          onChange={(e) => setNewActivity(e.target.value)}
          placeholder="New activity name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {activities.length === 0 ? (
        <p className="text-gray-500">No activities yet.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li
              key={activity}
              className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded"
            >
              <span>{activity}</span>
              <button
                type="button"
                onClick={() => handleRemove(activity)}
                className="text-red-600 hover:text-red-800 text-sm"
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

