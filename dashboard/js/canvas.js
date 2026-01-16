const canvas = document.getElementById("map-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const statePaths = [];
const selectedStates = new Set();
let canvasSize = { width: 0, height: 0 };

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

function buildPaths(features) {
  statePaths.length = 0;
  const bounds = computeBounds(features);
  if (!bounds) return false;

  const project = createProjector(bounds, 20);
  features.forEach((feature) => {
    const path = new Path2D();
    const { geometry, properties } = feature;
    const drawRing = (ring) => {
      ring.forEach(([lon, lat], index) => {
        const [x, y] = project([lon, lat]);
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

    statePaths.push({
      id: properties?.abbr || properties?.id || properties?.name || "state",
      name: properties?.name || "State",
      path,
    });
  });

  return statePaths.length > 0;
}

function syncSelection() {
  if (window.appState?.selectedStates) {
    window.appState.selectedStates = Array.from(selectedStates);
  }
}

function drawMap() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = "rgba(5, 5, 5, 0.7)";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  statePaths.forEach((state) => {
    const isSelected = selectedStates.has(state.id);
    if (isSelected) {
      ctx.fillStyle = "rgba(0, 255, 65, 0.2)";
      ctx.fill(state.path);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke(state.path);
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
    } else {
      ctx.stroke(state.path);
    }
  });
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
    drawMap();
  });

  try {
    const response = await fetch("assets/us-states.json");
    const data = await response.json();
    if (!data?.features?.length) {
      drawPlaceholderMap("Map data missing (assets/us-states.json)");
      return;
    }
    const built = buildPaths(data.features);
    if (!built) {
      drawPlaceholderMap("Map data invalid");
      return;
    }
    canvas.addEventListener("click", handleCanvasClick);
    drawMap();
  } catch (error) {
    console.error("Failed to load map data", error);
    drawPlaceholderMap("Map load failed");
  }
}

document.addEventListener("DOMContentLoaded", initCanvasMap);
