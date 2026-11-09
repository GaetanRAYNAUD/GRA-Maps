---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Carte principale

Scope: the map surface of the web app (`web/src`), the only screen of the first build. Mode: Operate.

Audience and job: a curious member of the public finds their commune or a territory, reads the indicator for a year, compares it with the others (rank, share), and scrubs through time. No account, no prior knowledge of INSEE sources.

Scope of this build: choropleth map (level, indicator, year), Jenks legend, hover, a card (fiche) for the selected region, departement or commune with ranks, shares and a true-time history chart, search (commune names from the data, addresses from api-adresse.data.gouv.fr), shareable URL. No basemap: data.gouv.fr boundary tiles only.

Must not feel: a dashboard (KPI cards, admin sidebar, widgets), a screen full of visible settings, unusable on mobile (card or legend covering everything).

Unresolved: whether mobile is on par with desktop beyond "usable"; WCAG level (AA assumed).

## Direction contract

THESIS: The map is a napoleonic cadastre plate: every territory washed in graded carmine like the hand-coloured plan each commune still keeps in its archives, the class read from the depth of the wash. It refuses the category default of a grey basemap, a left settings sidebar and a blue ramp.

OWN-WORLD: Cool white plate ground (not cream), Prussian blue #1f3a5f header band as the only shell colour, ink #2a2620 text, a six-step carmine wash ramp from #f6e3e5 to #8a2236, fine white paper seams between territories instead of black outlines, the selection traced in Prussian blue ink. One workhorse sans with tabular figures; territory names in tracked capitals like cadastre lettering. Hairline-ruled tables, 4px radii, no shadows beyond a hairline.

STORY: The visitor sees France washed by population today, understands darker means more, searches or clicks their place, reads its number, its rank and share at each level, then drags the year back to 1876 and watches the wash shift.

FIRST VIEWPORT: Prussian blue band on top: wordmark left, search, level segmented control, indicator select. Map fills the rest. Bottom-left floating legend plate: wash ramp with class bounds and the year scrubber with the year large in blue. Right: the card panel (420px) when something is selected, hidden otherwise. Mobile: band compresses to search + menu, legend docks at the bottom, the card is a bottom sheet whose half state holds name, number, rank and trend.

FORM: Cadastre napoléonien, candidate 4 of 7 on the ordered list. seed:b6518effbdfc4f81. Raises: one year scrubber recolours the whole map live (from the specimen); hairline-ruled dense rank table, no KPI cards (from the dense web); colour divides alone with white seams (from the guide map); history chart on a true time axis, census gaps visible (from labanotation); colour reserved for data, chrome stays ink and blue (from the lexicon); mobile half sheet holds the essentials without scrolling (from the j-card).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
