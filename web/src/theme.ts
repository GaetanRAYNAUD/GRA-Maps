import { useSyncExternalStore } from 'react'
import { useMediaQuery } from './useMediaQuery.ts'

export type Theme = 'light' | 'dark'
/** What the visitor chose: follow the system, or force one theme. */
export type ThemeChoice = 'system' | Theme

const storageKey = 'theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

let choice: ThemeChoice = read()

/** Band colour of each theme, for the browser bar (the theme-color metas of index.html). */
const bandColor: Record<Theme, string> = { light: '#1f4a3d', dark: '#173a2f' }

/** The stylesheet reads data-theme; index.html sets it before the first paint too. */
function apply(next: ThemeChoice) {
  if (next === 'system') delete document.documentElement.dataset['theme']
  else document.documentElement.dataset['theme'] = next
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: Theme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = bandColor[next === 'system' ? own : next]
  }
}

const notify = () => {
  for (const listener of listeners) listener()
}

apply(choice)

// A choice made in another tab.
window.addEventListener('storage', (event) => {
  if (event.key !== storageKey && event.key !== null) return
  choice = read()
  apply(choice)
  notify()
})

export function setThemeChoice(next: ThemeChoice) {
  choice = next
  apply(next)
  try {
    if (next === 'system') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, next)
  } catch {
    // Private browsing: the choice lasts for this page only.
  }
  notify()
}

/** Next choice in the switch order: system, light, dark. */
export function cycleThemeChoice() {
  setThemeChoice(choice === 'system' ? 'light' : choice === 'light' ? 'dark' : 'system')
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => choice,
  )
}

/** Theme on screen: the choice, or the system setting. */
export function useTheme(): Theme {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const current = useThemeChoice()
  return current === 'system' ? (systemDark ? 'dark' : 'light') : current
}
