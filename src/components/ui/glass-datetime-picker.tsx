'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface GlassDateTimePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
}

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES = [0, 15, 30, 45]

// Shared pill class building blocks
const PILL_BASE = 'flex items-center justify-center rounded-xl border transition-all duration-200 text-white font-medium select-none'
const PILL_IDLE = 'bg-white/10 hover:bg-white/20 border-white/15'
const PILL_SEL  = 'bg-blue-500/70 border-blue-400'

function pill(...extras: string[]) {
  return [PILL_BASE, ...extras].join(' ')
}

function to12h(h24: number): { hour12: number; ampm: 'AM' | 'PM' } {
  return { hour12: h24 % 12 || 12, ampm: h24 < 12 ? 'AM' : 'PM' }
}

function to24h(hour12: number, ampm: 'AM' | 'PM'): number {
  if (ampm === 'AM') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

function formatDisplay(date: Date): string {
  const month = MONTHS_SHORT[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  const { hour12, ampm } = to12h(date.getHours())
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${year} ${hour12}:${min} ${ampm}`
}

const PANEL_W = 172 // px — width of each sliding time step panel

export function GlassDateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time',
}: GlassDateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ── Calendar ──────────────────────────────
  const [viewYear, setViewYear]   = useState(() => value?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value?.getMonth()    ?? new Date().getMonth())
  const [selDate, setSelDate]     = useState<{ y: number; mo: number; d: number } | null>(
    value ? { y: value.getFullYear(), mo: value.getMonth(), d: value.getDate() } : null
  )

  // ── Time stepper ──────────────────────────
  const [timeStep,  setTimeStep]  = useState<1 | 2 | 3>(1)
  const [selHour12, setSelHour12] = useState<number | null>(value ? to12h(value.getHours()).hour12 : null)
  const [selMinute, setSelMinute] = useState<number | null>(value ? value.getMinutes() : null)
  const [selAmPm,   setSelAmPm]   = useState<'AM' | 'PM' | null>(value ? to12h(value.getHours()).ampm : null)

  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sync internal state when the value prop changes externally (e.g. reset after save)
  useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear())
      setViewMonth(value.getMonth())
      setSelDate({ y: value.getFullYear(), mo: value.getMonth(), d: value.getDate() })
      const { hour12, ampm } = to12h(value.getHours())
      setSelHour12(hour12)
      setSelMinute(value.getMinutes())
      setSelAmPm(ampm)
    } else {
      setSelDate(null)
      setSelHour12(null)
      setSelMinute(null)
      setSelAmPm(null)
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (!document.getElementById('gdtp-popup')?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      if (vw < 480) {
        setPopupPos({ top: rect.bottom + 8, left: 0 })
      } else {
        const maxLeft = vw - 430
        setPopupPos({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, maxLeft)) })
      }
      setTimeStep(1)
      if (!selDate) {
        const now = new Date()
        setSelDate({ y: now.getFullYear(), mo: now.getMonth(), d: now.getDate() })
        setViewYear(now.getFullYear())
        setViewMonth(now.getMonth())
      }
    }
    setOpen((o) => !o)
  }

  // ── Calendar handlers ──────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((mo) => mo - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((mo) => mo + 1)
  }

  const pickDate = (day: number) => {
    const next = { y: viewYear, mo: viewMonth, d: day }
    setSelDate(next)
    // If time is already fully chosen, close immediately
    if (selHour12 !== null && selMinute !== null && selAmPm !== null) {
      onChange(new Date(next.y, next.mo, next.d, to24h(selHour12, selAmPm), selMinute))
      setOpen(false)
    }
  }

  // ── Time step handlers ────────────────────
  const pickHour = (h: number) => {
    setSelHour12(h)
    setTimeStep(2)
  }

  const pickMinute = (m: number) => {
    setSelMinute(m)
    setTimeStep(3)
  }

  const pickAmPm = (ap: 'AM' | 'PM') => {
    setSelAmPm(ap)
    if (selHour12 !== null && selMinute !== null && selDate) {
      onChange(new Date(selDate.y, selDate.mo, selDate.d, to24h(selHour12, ap), selMinute))
      setOpen(false)
    }
  }

  // ── Derived calendar values ───────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const today       = new Date()

  const popup = open ? (
    <div
      id="gdtp-popup"
      style={{
        position: 'fixed',
        top: popupPos.top,
        ...(isMobile
          ? { left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100vw - 16px)' }
          : { left: popupPos.left }),
        zIndex: 9999,
      }}
      className={`rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-lg shadow-2xl p-4 flex gap-4 ${isMobile ? 'flex-col items-center' : ''}`}
    >

      {/* ════════════════ Calendar ════════════════ */}
      <div className="flex-shrink-0 w-[196px]">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button" onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-base leading-none"
          >‹</button>
          <span className="text-sm font-semibold text-white">
            {MONTHS_FULL[viewMonth]} {viewYear}
          </span>
          <button
            type="button" onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-base leading-none"
          >›</button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="w-7 text-center text-[10px] text-gray-500 py-0.5">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`gap-${i}`} className="w-7 h-7" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day   = i + 1
            const isSel = selDate?.y === viewYear && selDate?.mo === viewMonth && selDate?.d === day
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth()    === viewMonth &&
              today.getDate()     === day
            return (
              <button
                key={day}
                type="button"
                onClick={() => pickDate(day)}
                className={[
                  'w-7 h-7 flex items-center justify-center text-xs rounded-full transition-colors',
                  isSel   ? 'bg-blue-600 text-white font-semibold'
                  : isToday ? 'ring-1 ring-blue-400 text-blue-300 hover:bg-white/10'
                            : 'text-gray-200 hover:bg-white/10',
                ].join(' ')}
              >{day}</button>
            )
          })}
        </div>
      </div>

      {/* ════════════════ Divider ════════════════ */}
      {isMobile
        ? <div className="h-px bg-white/10 w-full" />
        : <div className="w-px bg-white/10 self-stretch" />}

      {/* ════════════════ Time stepper ════════════════ */}
      {/*
        Three panels sit in a horizontal flex track inside an overflow-hidden
        viewport. Translating the track by -(step-1)*PANEL_W reveals the
        correct panel with a smooth CSS slide.
      */}
      <div style={{ width: PANEL_W }} className={`overflow-hidden ${isMobile ? 'self-center' : 'self-start'}`}>
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(${-(timeStep - 1) * PANEL_W}px)` }}
        >

          {/* ── Step 1: Hours ────────────────────── */}
          <div style={{ width: PANEL_W, minWidth: PANEL_W }} className="flex flex-col gap-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest text-center pt-0.5">
              Pick a hour
            </span>
            {/* 4 columns × 3 rows = 12 hour buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => pickHour(h)}
                  className={pill('h-9 text-sm', selHour12 === h ? PILL_SEL : PILL_IDLE)}
                >{h}</button>
              ))}
            </div>
          </div>

          {/* ── Step 2: Minutes ──────────────────── */}
          <div style={{ width: PANEL_W, minWidth: PANEL_W }} className="flex flex-col gap-2.5">
            {/* Header with back arrow */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setTimeStep(1)}
                className="w-5 h-5 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
              >‹</button>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Minutes</span>
            </div>
            {/* 2 columns × 2 rows = 4 minute buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMinute(m)}
                  className={pill('h-12 text-base', selMinute === m ? PILL_SEL : PILL_IDLE)}
                >:{m.toString().padStart(2, '0')}</button>
              ))}
            </div>
          </div>

          {/* ── Step 3: AM / PM ──────────────────── */}
          <div style={{ width: PANEL_W, minWidth: PANEL_W }} className="flex flex-col gap-2.5">
            {/* Header with back arrow */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setTimeStep(2)}
                className="w-5 h-5 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
              >‹</button>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">AM / PM</span>
            </div>
            {/* Two large side-by-side pills */}
            <div className="flex gap-1.5">
              {(['AM', 'PM'] as const).map((ap) => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => pickAmPm(ap)}
                  className={pill('flex-1 h-12 text-base', selAmPm === ap ? PILL_SEL : PILL_IDLE)}
                >{ap}</button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  ) : null

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-2 text-left bg-transparent text-white focus:outline-none"
      >
        {value
          ? <span>{formatDisplay(value)}</span>
          : <span className="text-gray-400">{placeholder}</span>
        }
      </button>

      {mounted && popup ? createPortal(popup, document.body) : null}
    </div>
  )
}
