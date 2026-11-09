import { basemaps, thumbnailUrl } from './basemaps.ts'
import type { Basemap } from './basemaps.ts'
import { wash } from './palette.ts'

function Thumbnail({ basemap }: { basemap: Basemap }) {
  if (!basemap.layer) {
    // No background: a few wash cells, the plate as it is.
    return (
      <span className="basemap-thumb basemap-thumb-plain" aria-hidden="true">
        {[wash[1], wash[3], wash[2], wash[5]].map((colour, i) => (
          <i key={i} style={{ background: colour }} />
        ))}
      </span>
    )
  }
  return <img className="basemap-thumb" src={thumbnailUrl(basemap.layer)} alt="" loading="lazy" width={64} height={64} />
}

/** Background switch in the corner of the map, as on Google Maps: it shows the other background. */
export function BasemapPicker({ value, onChange }: { value: Basemap; onChange: (basemap: Basemap) => void }) {
  const next = basemaps[(basemaps.indexOf(value) + 1) % basemaps.length]!
  return (
    <div className="basemap">
      <button type="button" className="basemap-toggle" title={`Fond de carte : ${next.label}`} onClick={() => onChange(next)}>
        <Thumbnail basemap={next} />
        <span className="basemap-toggle-label">{next.layer ? 'Photos' : 'Carte'}</span>
      </button>
    </div>
  )
}
