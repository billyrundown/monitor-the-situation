const canvas = document.getElementById("map-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const statePaths = [];
const selectedStates = new Set();
let canvasSize = { width: 0, height: 0 };
let mapAnimationFrame = null;
let mapFeatures = null;
let canvasResizeObserver = null;
let resizeObserverFrame = null;
const DEBUG_HITTEST = new URLSearchParams(window.location.search).has("debug");
let debugOverlay = null;
let debugInfo = null;
let lastActivityStamp = 0;
let cachedActivity = {};
const THEME_COLORS = {
  green: "#00ff41",
  amber: "#ffb000",
  cyan: "#00ffff",
};
const STATE_ABBR = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasSize = { width: rect.width, height: rect.height };
}

function drawPlaceholderMap(message) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.strokeStyle = "#2a2a2a";
  ctx.strokeRect(40, 40, canvasSize.width - 80, canvasSize.height - 80);
  ctx.fillStyle = "#00ff41";
  ctx.font = "16px IBM Plex Mono, monospace";
  ctx.fillText(message, 60, 80);
}

function collectCoords(geometry, coords) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => ring.forEach((pt) => coords.push(pt)));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly) =>
      poly.forEach((ring) => ring.forEach((pt) => coords.push(pt)))
    );
  }
}

function computeBounds(features) {
  const coords = [];
  features.forEach((feature) => collectCoords(feature.geometry, coords));
  if (!coords.length) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  coords.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  });

  return { minLon, minLat, maxLon, maxLat };
}

function createProjector(bounds, padding) {
  const width = canvasSize.width - padding * 2;
  const height = canvasSize.height - padding * 2;
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const scale = Math.min(width / lonSpan, height / latSpan);
  const offsetX = padding + (width - lonSpan * scale) / 2;
  const offsetY = padding + (height - latSpan * scale) / 2;

  return ([lon, lat]) => {
    const x = (lon - bounds.minLon) * scale + offsetX;
    const y = (bounds.maxLat - lat) * scale + offsetY;
    return [x, y];
  };
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return { r: 0, g: 255, b: 65 };
  const int = parseInt(cleaned, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function computeStateActivity() {
  const appState = window.appState;
  if (!appState) return {};
  const now = Date.now();
  if (now - lastActivityStamp < 1500 && Object.keys(cachedActivity).length) {
    return cachedActivity;
  }

  const decay = appState.settings?.heatmapDecay ?? 3600000;
  const feeds = appState.feeds || [];
  const stories = appState.stories || [];
  const feedCounts = feeds.reduce((acc, feed) => {
    if (!feed.state) return acc;
    acc[feed.state] = (acc[feed.state] || 0) + 1;
    return acc;
  }, {});

  const activity = {};
  stories.forEach((story) => {
    const state = story.state;
    if (!state) return;
    const storyTime = new Date(story.pubDate || now).getTime() || now;
    const age = now - storyTime;
    if (age >= decay) return;
    const weight = 1 - age / decay;
    if (!activity[state]) {
      activity[state] = {
        storyCount: 0,
        feedCount: feedCounts[state] || 0,
        normalizedHeat: 0,
        lastStoryTime: 0,
        weightedScore: 0,
      };
    }
    activity[state].storyCount += 1;
    activity[state].weightedScore += weight;
    activity[state].lastStoryTime = Math.max(activity[state].lastStoryTime, storyTime);
  });

  Object.keys(activity).forEach((state) => {
    const feedCount = activity[state].feedCount || 1;
    activity[state].normalizedHeat = Math.min(activity[state].weightedScore / feedCount, 1);
  });

  appState.stateActivity = activity;
  cachedActivity = activity;
  lastActivityStamp = now;
  return activity;
}

function buildPaths(features) {
  statePaths.length = 0;
  const bounds = computeBounds(features);
  if (!bounds) return false;

  const project = createProjector(bounds, 20);
  features.forEach((feature) => {
    const path = new Path2D();
    const { geometry, properties } = feature;
    let sumX = 0;
    let sumY = 0;
    let pointCount = 0;
    const drawRing = (ring) => {
      ring.forEach(([lon, lat], index) => {
        const [x, y] = project([lon, lat]);
        sumX += x;
        sumY += y;
        pointCount += 1;
        if (index === 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      });
      path.closePath();
    };

    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach(drawRing);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((poly) => poly.forEach(drawRing));
    }

    const name = properties?.name || "State";
    const abbr = properties?.abbr || properties?.id || STATE_ABBR[name];
    statePaths.push({
      id: abbr || name,
      name,
      path,
      centroid:
        pointCount > 0
          ? { x: sumX / pointCount, y: sumY / pointCount }
          : null,
    });
  });

  return statePaths.length > 0;
}

function syncSelection() {
  if (window.appState?.selectedStates) {
    window.appState.selectedStates = Array.from(selectedStates);
  }
}

function drawMap(timestamp = 0) {
  if (!ctx) return;
  const appState = window.appState;
  const theme = appState?.settings?.theme || "green";
  const baseColor = THEME_COLORS[theme] || THEME_COLORS.green;
  const { r, g, b } = hexToRgb(baseColor);
  const activity = computeStateActivity();
  const decay = appState?.settings?.heatmapDecay ?? 3600000;
  const now = Date.now();
  const pulse = 0.5 + 0.5 * Math.sin(timestamp / 700);

  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = "rgba(5, 5, 5, 0.7)";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  statePaths.forEach((state) => {
    const heat = activity[state.id]?.normalizedHeat || 0;
    if (heat > 0) {
      const alpha = 0.08 + heat * 0.6;
      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.35 + heat * 0.5})`;
      ctx.shadowBlur = 10 + heat * 18 + 6 * pulse;
      ctx.fill(state.path);
      ctx.restore();
    }
  });

  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  statePaths.forEach((state) => {
    ctx.stroke(state.path);
  });

  statePaths.forEach((state) => {
    const isSelected = selectedStates.has(state.id);
    if (isSelected) {
      ctx.save();
      ctx.fillStyle = "rgba(82, 255, 143, 0.18)";
      ctx.shadowColor = "rgba(82, 255, 143, 0.6)";
      ctx.shadowBlur = 16 + 8 * pulse;
      ctx.fill(state.path);
      ctx.restore();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke(state.path);
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
    }
  });

  statePaths.forEach((state) => {
    const info = activity[state.id];
    if (!info?.lastStoryTime || !state.centroid) return;
    const age = now - info.lastStoryTime;
    if (age >= decay) return;
    const strength = 1 - age / decay;
    const radius = 2 + 5 * strength + 1.5 * pulse;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + strength * 0.6})`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.4 + strength * 0.4})`;
    ctx.shadowBlur = 8 + 10 * strength;
    ctx.arc(state.centroid.x, state.centroid.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function animateMap(timestamp) {
  drawMap(timestamp);
  mapAnimationFrame = requestAnimationFrame(animateMap);
}

function handleCanvasClick(event) {
  if (!ctx || statePaths.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = statePaths.find((state) => ctx.isPointInPath(state.path, x, y));

  if (hit) {
    if (!event.shiftKey) {
      selectedStates.clear();
    }
    if (selectedStates.has(hit.id)) {
      selectedStates.delete(hit.id);
    } else {
      selectedStates.add(hit.id);
    }
  } else {
    selectedStates.clear();
  }

  syncSelection();
  drawMap();
}

async function initCanvasMap() {
  if (!canvas || !ctx) return;
  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    if (mapFeatures?.length) {
      buildPaths(mapFeatures);
    }
    drawMap();
  });

  try {
    const response = await fetch("assets/us-states.json");
    const data = await response.json();
    if (!data?.features?.length) {
      drawPlaceholderMap("Map data missing (assets/us-states.json)");
      return;
    }
    mapFeatures = data.features;
    const built = buildPaths(mapFeatures);
    if (!built) {
      drawPlaceholderMap("Map data invalid");
      return;
    }
    canvas.addEventListener("click", handleCanvasClick);
    if (mapAnimationFrame) cancelAnimationFrame(mapAnimationFrame);
    mapAnimationFrame = requestAnimationFrame(animateMap);
  } catch (error) {
    console.error("Failed to load map data", error);
    drawPlaceholderMap("Map load failed");
  }
}

document.addEventListener("DOMContentLoaded", initCanvasMap);
