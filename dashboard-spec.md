# US News Monitoring Dashboard — Design Spec

## Overview

A personal dashboard for monitoring news across US states via RSS feeds. Features an interactive US map with heatmap visualization, scrolling news tickers, state/group selection, and DEFCON-style keyword alerts.

**Aesthetic:** Bloomberg terminal meets 1980s WarGames command center. Dark, glowy, retro-futuristic.

**Stack:** Vanilla HTML + CSS + JavaScript. Canvas for map rendering, DOM for UI components. JSON files for data, localStorage for runtime edits.

---

## Architecture

### File Structure

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
│   ├── groups.json     # State groupings (East Coast, etc.)
│   └── keywords.json   # DEFCON alert keywords
└── /assets
    └── us-states.json  # GeoJSON or path data for state boundaries
```

### Layer Model

```
┌─────────────────────────────────────────────────┐
│  DOM Layer (on top)                             │
│  ├── Tickers (horizontal scrolling)             │
│  ├── Settings panel (slide-out)                 │
│  ├── Groups sidebar                             │
│  ├── State detail overlay (when zoomed)         │
│  └── DEFCON alerts (floating)                   │
├─────────────────────────────────────────────────┤
│  Canvas Layer                                   │
│  ├── US map with state boundaries               │
│  ├── Heatmap glow per state                     │
│  ├── Pulsing dots for new stories               │
│  ├── Selection highlight outlines              │
│  └── Zoom/pan transitions                       │
├─────────────────────────────────────────────────┤
│  Background Layer (CSS)                         │
│  ├── Dark charcoal base                         │
│  ├── Subtle grid pattern                        │
│  └── CRT scanline overlay                       │
└─────────────────────────────────────────────────┘
```

---

## Data Model

### feeds.json

```json
{
  "feeds": [
    {
      "id": "tx-statesman",
      "url": "https://www.statesman.com/rss",
      "state": "TX",
      "name": "Austin American-Statesman"
    },
    {
      "id": "ca-latimes",
      "url": "https://www.latimes.com/rss",
      "state": "CA",
      "name": "LA Times"
    }
  ]
}
```

### groups.json

```json
{
  "groups": [
    {
      "id": "east-coast",
      "name": "East Coast",
      "states": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "VA", "NC", "SC", "GA", "FL"]
    },
    {
      "id": "swing-states",
      "name": "Swing States",
      "states": ["PA", "MI", "WI", "AZ", "GA", "NV", "NC"]
    }
  ]
}
```

### keywords.json

```json
{
  "keywords": [
    { "id": "k1", "word": "breaking", "priority": "high" },
    { "id": "k2", "word": "NVIDIA", "priority": "high" },
    { "id": "k3", "word": "Fed", "priority": "medium" }
  ]
}
```

### localStorage Schema

```javascript
// Keys used in localStorage
localStorage.setItem('dashboard_feeds', JSON.stringify([...]))      // Overrides feeds.json
localStorage.setItem('dashboard_groups', JSON.stringify([...]))     // Overrides groups.json  
localStorage.setItem('dashboard_keywords', JSON.stringify([...]))   // Overrides keywords.json
localStorage.setItem('dashboard_settings', JSON.stringify({
  tickerSpeed: 50,           // pixels per second
  refreshInterval: 300000,   // ms (5 min default)
  heatmapDecay: 3600000,     // ms until dots fully fade (1 hour)
  theme: 'green'             // 'green' | 'amber' | 'cyan'
}))
```

### Runtime State (in-memory)

```javascript
const appState = {
  // Current view
  view: 'map',                    // 'map' | 'state' | 'group'
  selectedStates: [],             // ['CA', 'TX'] for multi-select
  zoomedState: null,              // 'CA' when in state detail view
  activeGroup: null,              // 'east-coast' when viewing a group
  
  // Data
  feeds: [],                      // Loaded from JSON + localStorage
  groups: [],
  keywords: [],
  
  // Stories (fetched from RSS)
  stories: [
    {
      id: 'uuid',
      feedId: 'tx-statesman',
      state: 'TX',
      title: 'Headline here...',
      link: 'https://...',
      pubDate: '2025-01-16T10:30:00Z',
      source: 'Austin American-Statesman',
      isDefcon: false             // true if matches keyword
    }
  ],
  
  // Heatmap data (computed)
  stateActivity: {
    'TX': { 
      storyCount: 5, 
      feedCount: 2, 
      normalizedHeat: 0.7,        // 0-1 scale relative to own baseline
      lastStoryTime: 1705410600000 
    }
  }
}
```

---

## Visual Design

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Near black | `#0a0a0a` |
| Panel background | Dark charcoal | `#141414` |
| Border / grid | Dark gray | `#2a2a2a` |
| Primary text (green mode) | Terminal green | `#00ff41` |
| Primary text (amber mode) | Amber | `#ffb000` |
| Primary text (cyan mode) | Cyan | `#00ffff` |
| Secondary text | Dim gray | `#666666` |
| DEFCON alert | Hot red | `#ff0040` |
| Selection highlight | White | `#ffffff` |
| Heatmap glow | Same as primary text, varying opacity |

### Typography

```css
:root {
  --font-mono: 'IBM Plex Mono', 'Fira Code', 'Consolas', monospace;
  --font-size-ticker: 14px;
  --font-size-ui: 13px;
  --font-size-heading: 18px;
}
```

### Effects

**Scanlines (CSS pseudo-element)**
```css
.crt-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 9999;
}
```

**Text glow**
```css
.glow-text {
  text-shadow: 
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 20px currentColor;
}
```

**Heatmap state glow (Canvas)**
- Use `ctx.shadowBlur` and `ctx.shadowColor` when drawing state fills
- Opacity based on `normalizedHeat` value (0-1)
- Animate glow pulse for states with very recent stories

**Pulsing dots**
- Small circles at state centroid
- Spawn when new story arrives
- Start at full opacity, fade to 0 over `heatmapDecay` duration
- Scale down slightly as they fade

---

## Components

### 1. Canvas Map

**Responsibilities:**
- Render US map with state boundaries
- Apply heatmap glow per state based on activity
- Draw pulsing dots for new stories
- Handle click detection (point-in-polygon)
- Highlight selected states with bright outline
- Animate zoom transitions

**Interactions:**
- Click state → toggle selection (if not zoomed) or zoom into state
- Shift+click → multi-select
- Click outside states → deselect all
- Double-click state → zoom to full-screen state view
- Escape → zoom out / deselect

**Technical notes:**
- Use pre-computed SVG path data or GeoJSON for state boundaries
- Convert geo coordinates to canvas pixels with a simple projection
- Hit detection: use `ctx.isPointInPath()` or pre-computed bounding boxes
- For zoom: animate `scale` and `translate` transforms over ~300ms

### 2. Main Ticker

**Location:** Bottom of screen, full width

**Behavior:**
- Scrolls right-to-left continuously
- Shows stories from all feeds (main view) or filtered by selection
- Format: `[STATE] [SOURCE] Headline text ··· 5m ago`
- DEFCON stories get red text + glow
- Pause on hover
- Click headline → open article in new tab

**DOM structure:**
```html
<div class="ticker-container">
  <div class="ticker-track">
    <span class="ticker-item" data-story-id="...">
      <span class="ticker-state">TX</span>
      <span class="ticker-source">Statesman</span>
      <span class="ticker-headline">Headline here...</span>
      <span class="ticker-time">5m</span>
    </span>
    <!-- more items, duplicated for seamless loop -->
  </div>
</div>
```

**Animation:** CSS `translateX` animation, or JS `requestAnimationFrame` for more control

### 3. State Detail View (Zoomed)

**Triggered by:** Double-click a state

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [← Back]                        TEXAS        ⚙ │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ Austin American-Statesman               │   │
│   │ ══════════════════════════════════════► │   │
│   │ [ticker scrolling]                      │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ Houston Chronicle                       │   │
│   │ ══════════════════════════════════════► │   │
│   │ [ticker scrolling]                      │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ Recent Stories                          │   │
│   │ • Headline one...              2m ago   │   │
│   │ • Headline two...              15m ago  │   │
│   │ • Headline three...            1h ago   │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features:**
- One ticker per feed assigned to this state
- Recent stories list (scrollable, non-ticker format)
- Subtle state outline as background watermark (Canvas or SVG)
- Back button or Escape to return to map view

### 4. Groups Sidebar

**Location:** Left side, collapsible

**Layout:**
```
┌──────────────────────┐
│ GROUPS            [+]│
├──────────────────────┤
│ ► East Coast         │
│ ► West Coast         │
│ ► Midwest            │
│ ► South              │
│ ► Sun Belt           │
│ ► Swing States       │
├──────────────────────┤
│ [+ New Group]        │
└──────────────────────┘
```

**Interactions:**
- Click group → highlights those states on map + shows combined ticker
- Right-click or long-press → edit/delete group
- [+] button → modal to create new group (name + select states)

**When group is active:**
- Map stays zoomed out
- Selected states have bright outline
- Main ticker filters to only those states
- Optional: show mini-ticker per state in a panel

### 5. Settings Panel

**Triggered by:** Gear icon in top-right

**Slide-out panel from right side**

**Tabs:**
1. **Feeds** — CRUD for RSS feeds
2. **Groups** — Manage state groupings  
3. **Keywords** — DEFCON alert words
4. **Display** — Ticker speed, refresh rate, color theme

#### Feeds Tab

```
┌─────────────────────────────────────────────────┐
│ FEEDS                          [+ Add Feed]     │
├─────────────────────────────────────────────────┤
│ Search: [_______________]  State: [All ▼]       │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ LA Times                              [CA]  │ │
│ │ https://latimes.com/rss            [✎] [🗑] │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Austin Statesman                      [TX]  │ │
│ │ https://statesman.com/rss          [✎] [🗑] │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ [Export JSON]  [Import JSON]                    │
└─────────────────────────────────────────────────┘
```

**Add/Edit Feed Modal:**
```
┌─────────────────────────────────────┐
│ Add Feed                        [X] │
├─────────────────────────────────────┤
│ Name:  [_______________________]    │
│ URL:   [_______________________]    │
│ State: [Select state ▼        ]     │
├─────────────────────────────────────┤
│              [Cancel]  [Save]       │
└─────────────────────────────────────┘
```

#### Keywords Tab

```
┌─────────────────────────────────────────────────┐
│ DEFCON KEYWORDS                 [+ Add Keyword] │
├─────────────────────────────────────────────────┤
│ │ breaking                    [HIGH]    [🗑]  │ │
│ │ NVIDIA                      [HIGH]    [🗑]  │ │
│ │ Fed                         [MED]     [🗑]  │ │
│ │ earnings                    [LOW]     [🗑]  │ │
└─────────────────────────────────────────────────┘
```

Priority levels affect visual intensity of the alert.

#### Display Tab

```
┌─────────────────────────────────────────────────┐
│ DISPLAY SETTINGS                                │
├─────────────────────────────────────────────────┤
│ Color Theme                                     │
│ [● Green] [ ○ Amber] [ ○ Cyan]                  │
│                                                 │
│ Ticker Speed                                    │
│ Slow ════════●══════ Fast                       │
│                                                 │
│ Refresh Interval                                │
│ [5 minutes ▼]                                   │
│                                                 │
│ Heatmap Fade Duration                           │
│ [1 hour ▼]                                      │
└─────────────────────────────────────────────────┘
```

### 6. DEFCON Alerts

**Triggered by:** Story headline matches a keyword

**Visual treatment:**
- Ticker item turns red with glow
- Optional: floating alert toast in corner
- Optional: brief screen flash or border pulse

**Toast format:**
```
┌────────────────────────────────────┐
│ ⚠ DEFCON: "NVIDIA" matched         │
│ TX: NVIDIA announces new chip...   │
└────────────────────────────────────┘
```

Auto-dismiss after 5 seconds, or click to open article.

---

## RSS Handling

### CORS Problem

Browsers block cross-origin RSS fetches. Solutions:

1. **Public CORS proxy** (simplest for personal use)
   - Use `https://api.allorigins.win/get?url=`
   - Or `https://corsproxy.io/?`
   - Rate limits apply, fine for personal dashboard

2. **Your own proxy** (20 lines of code)
   - Cloudflare Worker (free tier)
   - Or simple Node/Python server

3. **RSS-to-JSON service**
   - `https://api.rss2json.com/v1/api.json?rss_url=`
   - Free tier: 10,000 requests/day

### Fetch Logic (pseudo-code)

```javascript
async function fetchFeed(feedUrl) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(proxyUrl);
  const data = await response.json();
  const xml = new DOMParser().parseFromString(data.contents, 'text/xml');
  
  const items = xml.querySelectorAll('item');
  return Array.from(items).map(item => ({
    title: item.querySelector('title')?.textContent,
    link: item.querySelector('link')?.textContent,
    pubDate: item.querySelector('pubDate')?.textContent,
  }));
}
```

### Refresh Strategy

- On load: fetch all feeds in parallel (with staggering to avoid rate limits)
- Then: `setInterval` at user-configured refresh rate
- Store `lastFetched` timestamp per feed
- Only update stories array with genuinely new items (dedupe by link)

---

## Heatmap Algorithm

### Goal

Make activity visualization *relative* so a state with 2 feeds isn't always dimmer than a state with 10 feeds.

### Approach

```javascript
function calculateNormalizedHeat(state) {
  const now = Date.now();
  const decay = settings.heatmapDecay; // e.g., 1 hour
  
  // Get stories for this state within decay window
  const recentStories = stories.filter(s => 
    s.state === state && 
    (now - new Date(s.pubDate).getTime()) < decay
  );
  
  // Weight by recency (newer = higher weight)
  const weightedScore = recentStories.reduce((sum, story) => {
    const age = now - new Date(story.pubDate).getTime();
    const recencyWeight = 1 - (age / decay); // 1.0 for brand new, 0.0 at decay limit
    return sum + recencyWeight;
  }, 0);
  
  // Normalize by feed count for this state
  const feedCount = feeds.filter(f => f.state === state).length;
  const normalizedScore = feedCount > 0 ? weightedScore / feedCount : 0;
  
  // Clamp to 0-1 range (scores above 1 mean very active)
  return Math.min(normalizedScore, 1);
}
```

### Visual Mapping

```javascript
function getHeatmapColor(normalizedHeat, theme) {
  const baseColor = themes[theme].primary; // e.g., '#00ff41'
  const alpha = 0.1 + (normalizedHeat * 0.6); // Range: 0.1 to 0.7
  return `${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
```

---

## Build Sequence

### Phase 1: Static Shell (Day 1)

1. Create `index.html` with layout structure
2. Set up `style.css` with color variables, fonts, dark theme
3. Add scanline overlay effect
4. Create placeholder divs for all components
5. **Checkpoint:** Dark themed page with correct layout, looks cool but empty

### Phase 2: Canvas Map (Day 2-3)

1. Find/create US state path data (SVG paths or GeoJSON)
2. Implement basic map rendering in `canvas.js`
3. Add state fill colors (flat, no heatmap yet)
4. Implement click detection (which state was clicked?)
5. Add selection highlight (bright outline)
6. Implement multi-select with shift+click
7. **Checkpoint:** Clickable US map with selection working

### Phase 3: Data Layer (Day 3-4)

1. Create sample JSON files with a few test feeds
2. Implement data loading (JSON fetch + localStorage merge)
3. Implement save to localStorage
4. Add export/import JSON functions
5. **Checkpoint:** Data persists between refreshes

### Phase 4: RSS Fetching (Day 4-5)

1. Implement RSS fetch with CORS proxy
2. Parse RSS XML to story objects
3. Dedupe and merge new stories
4. Set up refresh interval
5. **Checkpoint:** Console shows fetched stories updating

### Phase 5: Basic Ticker (Day 5-6)

1. Create ticker DOM structure
2. Implement continuous scroll animation
3. Populate with real story data
4. Add pause-on-hover
5. Add click-to-open-link
6. **Checkpoint:** Working ticker with real headlines

### Phase 6: Heatmap & Dots (Day 6-7)

1. Implement activity calculation per state
2. Add glow rendering to Canvas
3. Implement pulsing dots at state centroids
4. Add fade-over-time for dots
5. **Checkpoint:** Map glows based on activity, dots appear for new stories

### Phase 7: Settings Panel (Day 7-8)

1. Create slide-out panel structure
2. Implement Feeds tab with CRUD
3. Wire up add/edit/delete to data layer
4. Add search and filter
5. Implement Display tab (theme, speed, etc.)
6. **Checkpoint:** Can add/remove feeds via UI

### Phase 8: State Zoom View (Day 8-9)

1. Implement zoom animation on Canvas
2. Create state detail overlay
3. Generate per-feed tickers
4. Add recent stories list
5. Wire up back button / Escape
6. **Checkpoint:** Can zoom into a state and see its feeds

### Phase 9: Groups (Day 9-10)

1. Create groups sidebar
2. Implement group selection → map highlight
3. Filter main ticker by group
4. Add create/edit/delete group UI
5. Pre-populate default groups
6. **Checkpoint:** Groups fully functional

### Phase 10: DEFCON Keywords (Day 10-11)

1. Implement Keywords tab in settings
2. Add keyword matching to story processing
3. Style DEFCON stories in ticker (red + glow)
4. Add alert toasts
5. **Checkpoint:** Keywords trigger visual alerts

### Phase 11: Polish (Day 11-12)

1. Fine-tune animations and timing
2. Add keyboard shortcuts (Escape, number keys for groups?)
3. Responsive tweaks (if needed)
4. Performance optimization (throttle renders, limit DOM nodes)
5. Bug fixes and edge cases
6. **Checkpoint:** Ship it!

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Zoom out / deselect / close panel |
| `S` | Toggle settings panel |
| `G` | Toggle groups sidebar |
| `1-9` | Quick-select group by index |
| `R` | Force refresh all feeds |
| `/` | Focus search in settings |

---

## Future Ideas (Out of Scope for V1)

- Mobile/tablet responsive layout
- Push notifications for DEFCON alerts
- Historical view (what happened yesterday?)
- Sentiment analysis on headlines
- Integration with stock ticker API
- Map zoom to regions (not just states)
- Dark/light theme toggle (lol, who wants light mode)
- Shareable dashboard configs

---

## Resources

**US State Paths:**
- [US Atlas TopoJSON](https://github.com/topojson/us-atlas)
- [Simple SVG US Map](https://simplemaps.com/resources/svg-us)

**Fonts:**
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- [Fira Code](https://fonts.google.com/specimen/Fira+Code)

**CORS Proxies:**
- [AllOrigins](https://allorigins.win/)
- [corsproxy.io](https://corsproxy.io/)

**RSS to JSON:**
- [rss2json](https://rss2json.com/)

---

## Summary

You're building a WarGames-style news command center. Canvas handles the sexy map stuff, vanilla DOM handles the UI panels. JSON files are your database, localStorage handles runtime edits. No framework, no build step, just files.

Start with the map, get clicking working, then layer on features. You'll have something cool on screen by end of day 2.
