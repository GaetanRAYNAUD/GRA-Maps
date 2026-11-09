import { useEffect, useId, useRef, useState } from 'react'
import { communeOfCityCode } from './geo.ts'
import { Icon } from './Icon.tsx'

/** Address search of the national address base (IGN Géoplateforme). */
const endpoint = 'https://data.geopf.fr/geocodage/search'

type Result = {
  id: string
  label: string
  context: string
  type: 'municipality' | 'street' | 'housenumber' | 'locality'
  commune: string
  center: [number, number]
}

export type Place = { commune: string; center: [number, number]; zoom: number }

type Feature = {
  geometry: { coordinates: [number, number] }
  properties: { id: string; label: string; context: string; type: Result['type']; citycode: string; postcode?: string }
}

const zoomByType: Record<Result['type'], number> = { municipality: 9.5, locality: 12, street: 13, housenumber: 13 }
const typeLabel: Record<Result['type'], string> = { municipality: 'Commune', locality: 'Lieu-dit', street: 'Voie', housenumber: 'Adresse' }

export function Search({ onPlace }: { onPlace: (place: Place) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setStatus('loading')
      try {
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`, { signal: controller.signal })
        if (!response.ok) throw new Error(String(response.status))
        const body = (await response.json()) as { features: Feature[] }
        const next = body.features
          .filter((f) => !f.properties.citycode.startsWith('97'))
          .map((f) => ({
            id: f.properties.id,
            label: f.properties.label,
            context: f.properties.context,
            type: f.properties.type,
            commune: communeOfCityCode(f.properties.citycode),
            center: f.geometry.coordinates,
          }))
        setResults(next)
        setActive(next.length ? 0 : -1)
        setStatus(next.length ? 'idle' : 'empty')
      } catch (error) {
        if (!controller.signal.aborted) setStatus('error')
      }
    }, 220)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const choose = (result: Result) => {
    onPlace({ commune: result.commune, center: result.center, zoom: zoomByType[result.type] })
    setQuery(result.label)
    setOpen(false)
    input.current?.blur()
  }

  const showList = open && query.trim().length >= 3 && (results.length > 0 || status !== 'idle')

  return (
    <div className="search" role="search">
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        placeholder="Commune, adresse…"
        aria-label="Rechercher une commune ou une adresse"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (event.key === 'Enter') {
            const result = results[active]
            if (result) {
              event.preventDefault()
              choose(result)
            }
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {showList ? (
        <ul className="search-list" id={listId} role="listbox" aria-label="Résultats">
          {results.map((result, i) => (
            <li
              key={result.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={(event) => {
                event.preventDefault()
                choose(result)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search-label">{result.label}</span>
              <span className="search-context">
                {typeLabel[result.type]} · {result.context}
              </span>
            </li>
          ))}
          {status === 'loading' && results.length === 0 ? <li className="search-status">Recherche…</li> : null}
          {status === 'empty' ? <li className="search-status">Aucun résultat en France métropolitaine.</li> : null}
          {status === 'error' ? <li className="search-status">La recherche ne répond pas. Réessayez dans un instant.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
