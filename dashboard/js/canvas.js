const canvas = document.getElementById("map-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;

function drawPlaceholderMap() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#2a2a2a";
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  ctx.fillStyle = "#00ff41";
  ctx.font = "16px IBM Plex Mono, monospace";
  ctx.fillText("Map canvas placeholder", 60, 80);
}

drawPlaceholderMap();
