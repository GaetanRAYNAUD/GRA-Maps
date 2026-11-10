import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon.tsx'
import type { Indicator } from './indicators.ts'
import { indicators } from './indicators.ts'

const groups = ['Population', 'État civil'] as const

type Props = {
  value: Indicator
  onChange: (indicator: Indicator) => void
  /** Indicators offered, all by default. */
  options?: Indicator[]
}

/** An indicator: a plate button (in the band, or in the chart dialog) opening a grouped list. */
export function IndicatorPicker({ value, onChange, options = indicators }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => options.indexOf(value))
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const labelId = useId()

  useEffect(() => {
    if (!open) return
    setActive(options.indexOf(value))
    list.current?.focus()
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (indicator: Indicator) => {
    onChange(indicator)
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div className="picker" ref={root}>
      <button
        ref={button}
        type="button"
        className="picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${listId}-value`}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className="picker-label" id={labelId}>
          Indicateur
        </span>
        <span className="picker-value" id={`${listId}-value`}>
          {value.label}
        </span>
        <Icon name={open ? 'expand' : 'chevron'} />
      </button>
      {open ? (
        <ul
          ref={list}
          className="picker-list"
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((a) => Math.min(a + 1, options.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (event.key === 'Home') {
              event.preventDefault()
              setActive(0)
            } else if (event.key === 'End') {
              event.preventDefault()
              setActive(options.length - 1)
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              const indicator = options[active]
              if (indicator) choose(indicator)
            } else if (event.key === 'Escape' || event.key === 'Tab') {
              // Escape closes the list only, not a dialog around it.
              if (event.key === 'Escape') event.preventDefault()
              setOpen(false)
              if (event.key === 'Escape') button.current?.focus()
            }
          }}
        >
          {groups
            .filter((group) => options.some((indicator) => indicator.group === group))
            .map((group) => (
              <li key={group} role="presentation">
                <span className="picker-group" aria-hidden="true">
                  {group}
                </span>
                <ul role="group" aria-label={group}>
                  {options
                    .filter((indicator) => indicator.group === group)
                    .map((indicator) => {
                      const index = options.indexOf(indicator)
                      const selected = indicator.slug === value.slug
                      return (
                        <li
                          key={indicator.slug}
                          id={`${listId}-${index}`}
                          role="option"
                          aria-selected={selected}
                          className={`picker-option${index === active ? ' is-active' : ''}`}
                          onPointerEnter={() => setActive(index)}
                          onClick={() => choose(indicator)}
                        >
                          <span className="picker-option-label">{indicator.label}</span>
                          <span className="picker-option-hint">{indicator.hint}</span>
                          {selected ? <Icon name="check" /> : null}
                        </li>
                      )
                    })}
                </ul>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  )
}
