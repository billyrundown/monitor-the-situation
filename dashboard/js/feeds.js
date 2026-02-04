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

const ALL_ORIGINS_URL = "https://api.allorigins.win/get?url=";

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

async function fetchFeedItems(feedUrl) {
  const proxyUrl = `${ALL_ORIGINS_URL}${encodeURIComponent(feedUrl)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy response ${response.status}`);
    }
    const data = await response.json();
    if (!data?.contents) return [];
    const xml = new DOMParser().parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));
    return items.map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
    }));
  } catch (error) {
    console.warn("Feed fetch failed", feedUrl, error);
    return [];
  }
}

function normalizeStories(feed, items) {
  if (!feed || !Array.isArray(items)) return [];
  return items.map((item) => ({
    id: crypto.randomUUID(),
    feedId: feed.id,
    state: feed.state,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: feed.name,
    isDefcon: false,
  }));
}

function matchDefcon(story, keywords) {
  if (!story?.title || !Array.isArray(keywords)) return false;
  const headline = story.title.toLowerCase();
  return keywords.some((keyword) => {
    const word = keyword?.word?.toLowerCase();
    return word ? headline.includes(word) : false;
  });
}

function makeDedupeKey(story) {
  if (story.link) return story.link;
  return `${story.title || ""}-${story.pubDate || ""}`;
}

function mergeStories(existing, incoming) {
  const merged = [];
  const seen = new Set();

  existing.forEach((story) => {
    const key = makeDedupeKey(story);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(story);
  });

  incoming.forEach((story) => {
    const key = makeDedupeKey(story);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(story);
  });

  merged.sort((a, b) => {
    const timeA = new Date(a.pubDate || 0).getTime();
    const timeB = new Date(b.pubDate || 0).getTime();
    return timeB - timeA;
  });

  return merged;
}

function updateStateActivity(appState, newStories) {
  if (!appState) return;
  const now = Date.now();
  const nextActivity = { ...appState.stateActivity };

  newStories.forEach((story) => {
    const state = story.state;
    if (!state) return;
    if (!nextActivity[state]) {
      nextActivity[state] = {
        storyCount: 0,
        feedCount: 0,
        normalizedHeat: 0,
        lastStoryTime: 0,
      };
    }
    nextActivity[state].storyCount += 1;
    const storyTime = new Date(story.pubDate || now).getTime() || now;
    nextActivity[state].lastStoryTime = Math.max(
      nextActivity[state].lastStoryTime,
      storyTime
    );
  });

  appState.stateActivity = nextActivity;
}

async function refreshFeeds(appState) {
  const feeds = appState?.feeds || [];
  if (!feeds.length) return;
  const keywords = appState?.keywords || [];

  const results = await Promise.all(
    feeds.map(async (feed, index) => {
      await new Promise((resolve) => setTimeout(resolve, index * 150));
      const items = await fetchFeedItems(feed.url);
      const stories = normalizeStories(feed, items);
      stories.forEach((story) => {
        story.isDefcon = matchDefcon(story, keywords);
      });
      return stories;
    })
  );

  const incoming = results.flat();
  appState.stories = mergeStories(appState.stories || [], incoming);
  updateStateActivity(appState, incoming);
}

function startFeedRefresh(appState) {
  if (!appState) return null;
  refreshFeeds(appState);
  const intervalMs = appState.settings?.refreshInterval ?? DEFAULT_SETTINGS.refreshInterval;
  return setInterval(() => {
    refreshFeeds(appState);
  }, intervalMs);
}

window.fetchFeedItems = fetchFeedItems;
window.normalizeStories = normalizeStories;
window.mergeStories = mergeStories;
window.startFeedRefresh = startFeedRefresh;
