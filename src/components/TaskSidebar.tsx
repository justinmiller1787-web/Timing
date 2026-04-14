'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Star } from 'lucide-react'
import { getActivities } from '@/lib/storage'
import {
  type Task,
  completeTask,
  formatDueDateLabel,
  getTasks,
  subscribeTasks,
  updateTask,
} from '@/lib/tasks'

function TaskEditModal({
  task,
  onClose,
  onSave,
}: {
  task: Task
  onClose: () => void
  onSave: (changes: Partial<Task>) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [linkedActivityName, setLinkedActivityName] = useState(task.linkedActivityName || 'Other')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [starred, setStarred] = useState(task.starred)
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekdays' | 'custom'>(task.recurrence?.type ?? 'daily')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(task.recurrence?.daysOfWeek ?? [])
  const activities = useMemo(() => {
    const sorted = [...getActivities()].sort((a, b) => a.localeCompare(b))
    if (!sorted.includes('Other')) sorted.push('Other')
    return sorted
  }, [])

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)))
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-white/20 bg-slate-900/95 p-4 space-y-3"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">Edit task</h3>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white"
          placeholder="Task title"
        />
        <div>
          <label className="block text-xs text-blue-200 mb-1">Activity</label>
          <select
            value={linkedActivityName}
            onChange={(event) => setLinkedActivityName(event.target.value)}
            className="w-full rounded border border-white/20 bg-slate-800 px-2 py-2 text-sm text-white"
          >
            {activities.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-blue-200 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="w-full rounded border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </div>
        {task.type === 'recurring' && (
          <div className="space-y-2">
            <label className="block text-xs text-blue-200">Recurrence</label>
            <select
              value={recurrenceType}
              onChange={(event) => setRecurrenceType(event.target.value as 'daily' | 'weekdays' | 'custom')}
              className="w-full rounded border border-white/20 bg-slate-800 px-2 py-2 text-sm text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="custom">Custom weekdays</option>
            </select>
            {recurrenceType === 'custom' && (
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, dayIndex) => (
                  <button
                    key={`${label}-${dayIndex}`}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={`rounded px-1 py-1 text-xs border ${
                      daysOfWeek.includes(dayIndex)
                        ? 'bg-blue-600 border-blue-300 text-white'
                        : 'bg-slate-800 border-white/20 text-blue-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-blue-100">
          <input checked={starred} onChange={(event) => setStarred(event.target.checked)} type="checkbox" />
          Starred
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border border-white/20 px-3 py-1.5 text-sm text-blue-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                title: title.trim(),
                linkedActivityName: linkedActivityName || 'Other',
                dueDate: dueDate || undefined,
                starred,
                recurrence:
                  task.type === 'recurring'
                    ? {
                        type: recurrenceType,
                        daysOfWeek: recurrenceType === 'custom' ? daysOfWeek : undefined,
                      }
                    : undefined,
              })
            }}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function SidebarSection({
  title,
  tasks,
  onComplete,
  onToggleStar,
  onEdit,
  onLogTime,
}: {
  title: string
  tasks: Task[]
  onComplete: (taskId: string) => void
  onToggleStar: (task: Task) => void
  onEdit: (task: Task) => void
  onLogTime: (task: Task) => void
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-blue-200">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-blue-200/70">No tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="group rounded border border-white/15 bg-white/5 p-2">
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={false} onChange={() => onComplete(task.id)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{task.title}</div>
                  <div className="text-xs text-blue-100/80">{formatDueDateLabel(task.dueDate)}</div>
                </div>
                <button type="button" onClick={() => onToggleStar(task)} className="text-yellow-400 mt-0.5">
                  <Star size={15} fill={task.starred ? 'currentColor' : 'transparent'} />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-200"
                  aria-label="Edit task"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onLogTime(task)}
                className="mt-2 w-full rounded bg-blue-700/90 hover:bg-blue-700 text-white text-xs py-1.5"
              >
                Log time
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function TaskSidebar() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    const refresh = () => setTasks(getTasks())
    refresh()
    return subscribeTasks(refresh)
  }, [])

  const activeTasks = tasks.filter((task) => !task.completed).sort((a, b) => a.order - b.order)
  const oneTimeTasks = activeTasks.filter((task) => task.type === 'one-time')
  const recurringTasks = activeTasks.filter((task) => task.type === 'recurring')

  return (
    <>
      {/* Same outer shell as LiquidGlass: glass panel on the shader background */}
      <aside
        className="relative w-full max-w-md shrink-0 rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur-md lg:w-[300px] lg:max-w-none sticky top-24 z-10 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-glass shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        aria-label="Tasks sidebar"
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
        </div>
        <div className="relative z-10 space-y-4 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-blue-600">Tasks</h2>
          <SidebarSection
            title="One-Time"
            tasks={oneTimeTasks}
            onComplete={(taskId) => completeTask(taskId)}
            onToggleStar={(task) => updateTask(task.id, { starred: !task.starred })}
            onEdit={(task) => setEditingTask(task)}
            onLogTime={(task) => {
              const params = new URLSearchParams()
              params.set('activity', task.linkedActivityName || 'Other')
              params.set('taskId', task.id)
              router.push(`/?${params.toString()}`)
            }}
          />
          <SidebarSection
            title="Recurring"
            tasks={recurringTasks}
            onComplete={(taskId) => completeTask(taskId)}
            onToggleStar={(task) => updateTask(task.id, { starred: !task.starred })}
            onEdit={(task) => setEditingTask(task)}
            onLogTime={(task) => {
              const params = new URLSearchParams()
              params.set('activity', task.linkedActivityName || 'Other')
              params.set('taskId', task.id)
              router.push(`/?${params.toString()}`)
            }}
          />
        </div>
      </aside>
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(changes) => {
            if (!changes.title) return
            updateTask(editingTask.id, changes)
            setEditingTask(null)
          }}
        />
      )}
    </>
  )
}
