const appState = {
  view: "map",
  selectedStates: [],
  zoomedState: null,
  activeGroup: null,
  feeds: [],
  groups: [],
  keywords: [],
  settings: {},
  stories: [],
  stateActivity: {},
};

async function initApp() {
  try {
    const data = await window.loadDashboardData?.();
    if (data) {
      appState.feeds = data.feeds;
      appState.groups = data.groups;
      appState.keywords = data.keywords;
      appState.settings = data.settings;
    }
    console.log("Dashboard shell loaded", appState);
  } catch (error) {
    console.error("Failed to initialize dashboard data", error);
  }
}

document.addEventListener("DOMContentLoaded", initApp);
