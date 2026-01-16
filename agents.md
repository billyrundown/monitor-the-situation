# AGENTS.md

## Project Overview
This project builds a US news monitoring dashboard that visualizes RSS feeds by state. The UI combines a retro terminal aesthetic (Bloomberg terminal meets 1980s command center) with a canvas-rendered US map, scrolling tickers, and DEFCON-style keyword alerts. The stack is vanilla HTML, CSS, and JavaScript with JSON data files and localStorage for runtime edits.

## Goals
- Interactive US map with heatmap activity by state and selection/zoom behavior.
- Continuous news ticker(s) that reflect current selections and DEFCON alerts.
- Settings and management UI for feeds, groups, keywords, and display options.
- Local-first data model (JSON + localStorage overrides), no build step.

## Architecture Summary
- Canvas layer renders the US map, heatmap glow, selection outlines, and pulsing dots.
- DOM layer renders tickers, settings panel, groups sidebar, overlays, and alerts.
- Data layer loads JSON from /data and merges with localStorage overrides.

## Planned File Structure
```
/dashboard
├── index.html          # Main shell, DOM structure
├── style.css           # All styling, retro aesthetic
├── /js
│   ├── app.js          # Main orchestration, state management
│   ├── canvas.js       # Map rendering, heatmap, zoom, effects
│   ├── feeds.js        # RSS fetching, parsing, story management
│   ├── ticker.js       # Ticker component logic
│   └── ui.js           # Settings panel, modals, sidebar
├── /data
│   ├── feeds.json      # RSS feed URLs mapped to states
│   ├── groups.json     # State groupings
│   └── keywords.json   # DEFCON alert keywords
└── /assets
    └── us-states.json  # GeoJSON or path data for state boundaries
```

## Data Model Notes
- JSON files provide baseline data; localStorage overrides persist runtime edits.
- Stories dedupe by link and are refreshed on a configurable interval.
- Heatmap intensity is normalized per state by feed count and recency.

## Key UI Components
- Canvas map: state boundaries, heat glow, pulsing dots, zoom/pan.
- Main ticker: continuous scroll with state/source/time and DEFCON highlighting.
- State detail view: per-feed tickers + recent stories list.
- Groups sidebar: group selection and CRUD.
- Settings panel: feeds, groups, keywords, display settings.
- DEFCON alerts: red glow in ticker and optional toast.

## Interaction Summary
- Click state to select; shift+click for multi-select.
- Double-click a state to zoom into a state detail view.
- Escape to zoom out, deselect, or close panels.
- Keyboard shortcuts include S (settings), G (groups), 1-9 (groups).

## Development Phases
1) Static shell and layout scaffolding.
2) Canvas map rendering + selection.
3) Data loading + persistence.
4) RSS fetching + parsing + dedupe.
5) Ticker behavior.
6) Heatmap glow + pulsing dots.
7) Settings panel with CRUD.
8) State zoom view.
9) Groups sidebar and filtering.
10) DEFCON keywords + alerts.
11) Polish and performance.

## Notes
- Browser CORS requires a proxy (e.g., AllOrigins) or a small custom proxy.
- No framework, no build step, just static files.
