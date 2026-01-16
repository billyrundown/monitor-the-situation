const STORAGE_KEYS = {
  feeds: "dashboard_feeds",
  groups: "dashboard_groups",
  keywords: "dashboard_keywords",
  settings: "dashboard_settings",
};

const DEFAULT_SETTINGS = {
  tickerSpeed: 50,
  refreshInterval: 300000,
  heatmapDecay: 3600000,
  theme: "green",
};

function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse localStorage", key, error);
    return null;
  }
}

function mergeArray(base, override) {
  return Array.isArray(override) ? override : base;
}

function mergeSettings(defaults, override) {
  if (override && typeof override === "object" && !Array.isArray(override)) {
    return { ...defaults, ...override };
  }
  return defaults;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadDashboardData() {
  const [feedsJson, groupsJson, keywordsJson] = await Promise.all([
    loadJson("data/feeds.json"),
    loadJson("data/groups.json"),
    loadJson("data/keywords.json"),
  ]);

  const feeds = mergeArray(feedsJson.feeds || [], readLocalStorage(STORAGE_KEYS.feeds));
  const groups = mergeArray(
    groupsJson.groups || [],
    readLocalStorage(STORAGE_KEYS.groups)
  );
  const keywords = mergeArray(
    keywordsJson.keywords || [],
    readLocalStorage(STORAGE_KEYS.keywords)
  );
  const settings = mergeSettings(
    DEFAULT_SETTINGS,
    readLocalStorage(STORAGE_KEYS.settings)
  );

  return { feeds, groups, keywords, settings };
}

window.loadDashboardData = loadDashboardData;
