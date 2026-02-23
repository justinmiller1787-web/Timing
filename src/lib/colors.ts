// Tailwind 400-level colors — single source of truth used by the color picker
// swatches, timeline entries, and analytics page. Saturated enough to be
// visually distinct from each other and light enough for dark text to be
// readable on top.
export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'red',    hex: '#f87171' }, // red-400
  { name: 'orange', hex: '#fb923c' }, // orange-400
  { name: 'amber',  hex: '#fbbf24' }, // amber-400
  { name: 'yellow', hex: '#facc15' }, // yellow-400
  { name: 'lime',   hex: '#a3e635' }, // lime-400
  { name: 'green',  hex: '#4ade80' }, // green-400
  { name: 'teal',   hex: '#2dd4bf' }, // teal-400
  { name: 'cyan',   hex: '#22d3ee' }, // cyan-400
  { name: 'blue',   hex: '#60a5fa' }, // blue-400
  { name: 'indigo', hex: '#818cf8' }, // indigo-400
  { name: 'violet', hex: '#a78bfa' }, // violet-400
  { name: 'purple', hex: '#c084fc' }, // purple-400
  { name: 'pink',   hex: '#f472b6' }, // pink-400
  { name: 'rose',   hex: '#fb7185' }, // rose-400
  { name: 'slate',  hex: '#94a3b8' }, // slate-400
]

// Default colors for built-in activities — same 400-level palette values.
export const DEFAULT_ACTIVITY_COLORS: Record<string, string> = {
  Sleep:     '#60a5fa', // blue-400
  Classes:   '#a78bfa', // violet-400
  Studying:  '#4ade80', // green-400
  Gym:       '#f87171', // red-400
  Work:      '#fbbf24', // amber-400
  Social:    '#f472b6', // pink-400
  Scrolling: '#94a3b8', // slate-400
  Other:     '#fb923c', // orange-400
}

export const FALLBACK_COLOR = '#94a3b8' // slate-400

// Returns the stored or default color for an activity.
export function resolveColor(
  activity: string,
  stored: Record<string, string>
): string {
  return stored[activity] ?? DEFAULT_ACTIVITY_COLORS[activity] ?? FALLBACK_COLOR
}

// Picks an auto-assigned color for a new activity.
// Prefers unused palette colors; falls back to the full palette if all are taken.
// Pass a map of { activityName -> resolvedHex } for all existing activities.
export function pickAutoColor(existingResolvedColors: Record<string, string>): string {
  const usedHexes = new Set(Object.values(existingResolvedColors))
  const unused = COLOR_PALETTE.filter(({ hex }) => !usedHexes.has(hex))
  const pool = unused.length > 0 ? unused : COLOR_PALETTE
  return pool[Math.floor(Math.random() * pool.length)].hex
}

// Kept for backward compatibility with any callers that may still reference it.
export function hexToLightBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r * 0.3 + 255 * 0.7)
  const lg = Math.round(g * 0.3 + 255 * 0.7)
  const lb = Math.round(b * 0.3 + 255 * 0.7)
  return `rgb(${lr}, ${lg}, ${lb})`
}
