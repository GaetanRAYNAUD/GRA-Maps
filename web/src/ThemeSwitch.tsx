import type { IconName } from './Icon.tsx'
import { Icon } from './Icon.tsx'
import type { ThemeChoice } from './theme.ts'
import { cycleThemeChoice, useThemeChoice } from './theme.ts'

const order: ThemeChoice[] = ['system', 'light', 'dark']

const labels: Record<ThemeChoice, { icon: IconName; label: string }> = {
  system: { icon: 'auto', label: 'Thème du système' },
  light: { icon: 'sun', label: 'Thème clair' },
  dark: { icon: 'moon', label: 'Thème sombre' },
}

/** One quiet button in the band: each press moves to the next choice, system, light, dark. */
export function ThemeSwitch() {
  const choice = useThemeChoice()
  const next = order[(order.indexOf(choice) + 1) % order.length]!
  const { icon, label } = labels[choice]
  const title = `${label}. Passer au ${labels[next].label.toLowerCase()}`
  return (
    <button type="button" className="theme-switch" onClick={cycleThemeChoice} title={title} aria-label={title}>
      <Icon name={icon} />
      <span className="theme-switch-label">{label}</span>
    </button>
  )
}
