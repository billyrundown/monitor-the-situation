const tickerContainer = document.getElementById("main-ticker");
const tickerTrack = tickerContainer?.querySelector(".ticker-track");
let tickerOffset = 0;
let tickerLastTime = 0;
let tickerPaused = false;
let tickerLoopWidth = 0;

function formatTimeAgo(dateString) {
  const date = dateString ? new Date(dateString) : null;
  if (!date || Number.isNaN(date.getTime())) return "now";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function getTickerStories() {
  const stories = window.appState?.stories || [];
  if (stories.length) return stories;
  return [
    {
      id: "placeholder-1",
      state: "TX",
      source: "Statesman",
      title: "Headline placeholder for the scrolling ticker",
      pubDate: new Date().toISOString(),
      isDefcon: false,
    },
  ];
}

function renderTickerItems() {
  if (!tickerTrack) return;
  tickerTrack.innerHTML = "";
  const stories = getTickerStories();
  const fragment = document.createDocumentFragment();
  stories.forEach((story) => {
    const item = document.createElement("span");
    item.className = "ticker-item";
    if (story.isDefcon) {
      item.style.color = "var(--alert)";
      item.classList.add("glow-text");
    }
    item.innerHTML = `
      <span class="ticker-state">${story.state}</span>
      <span class="ticker-source">${story.source}</span>
      <span class="ticker-headline">${story.title}</span>
      <span class="ticker-time">${formatTimeAgo(story.pubDate)}</span>
    `;
    fragment.appendChild(item);
  });
  tickerTrack.appendChild(fragment);

  const clone = tickerTrack.cloneNode(true);
  Array.from(clone.children).forEach((child) => tickerTrack.appendChild(child));
  tickerLoopWidth = tickerTrack.scrollWidth / 2;
}

function stepTicker(timestamp) {
  if (!tickerTrack) return;
  if (!tickerLastTime) tickerLastTime = timestamp;
  const delta = timestamp - tickerLastTime;
  tickerLastTime = timestamp;

  if (!tickerPaused) {
    const speed = window.appState?.settings?.tickerSpeed || 50;
    tickerOffset -= (speed * delta) / 1000;
    if (Math.abs(tickerOffset) >= tickerLoopWidth) {
      tickerOffset = 0;
    }
    tickerTrack.style.transform = `translateX(${tickerOffset}px)`;
  }

  requestAnimationFrame(stepTicker);
}

function initTicker() {
  if (!tickerContainer || !tickerTrack) return;
  renderTickerItems();
  tickerContainer.addEventListener("mouseenter", () => {
    tickerPaused = true;
  });
  tickerContainer.addEventListener("mouseleave", () => {
    tickerPaused = false;
  });
  window.addEventListener("resize", () => {
    renderTickerItems();
  });
  requestAnimationFrame(stepTicker);
}

document.addEventListener("DOMContentLoaded", initTicker);
