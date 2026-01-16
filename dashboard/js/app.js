const appState = {
  view: "map",
  selectedStates: [],
  zoomedState: null,
  activeGroup: null,
  feeds: [],
  groups: [],
  keywords: [],
  stories: [],
  stateActivity: {},
};

function initApp() {
  console.log("Dashboard shell loaded", appState);
}

document.addEventListener("DOMContentLoaded", initApp);
