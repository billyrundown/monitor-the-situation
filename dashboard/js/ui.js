const settingsPanel = document.getElementById("settings-panel");
const groupsPanel = document.getElementById("groups-panel");
const groupList = document.getElementById("group-list");
const stateOverlay = document.getElementById("state-overlay");
const stateTitle = document.querySelector(".state-title");
const stateBack = document.getElementById("state-back");

function togglePanel(panel) {
  if (!panel) return;
  const isHidden = panel.getAttribute("aria-hidden") === "true";
  panel.setAttribute("aria-hidden", isHidden ? "false" : "true");
}

document.getElementById("toggle-settings")?.addEventListener("click", () => {
  togglePanel(settingsPanel);
});

document.getElementById("toggle-groups")?.addEventListener("click", () => {
  togglePanel(groupsPanel);
});

function renderGroups() {
  if (!groupList) return;
  const groups = window.appState?.groups || [];
  groupList.innerHTML = "";
  groups.forEach((group) => {
    const item = document.createElement("li");
    item.className = "group-item";
    item.textContent = group.name;
    item.dataset.groupId = group.id;
    groupList.appendChild(item);
  });
}

function setActiveGroup(groupId) {
  const groups = window.appState?.groups || [];
  const group = groups.find((entry) => entry.id === groupId);
  if (!window.appState) return;

  if (window.appState.activeGroup === groupId) {
    window.appState.activeGroup = null;
    window.setSelectedStates?.([]);
  } else {
    window.appState.activeGroup = groupId;
    window.setSelectedStates?.(group?.states || []);
  }
  updateGroupActiveState();
}

function updateGroupActiveState() {
  if (!groupList) return;
  const activeId = window.appState?.activeGroup;
  Array.from(groupList.children).forEach((node) => {
    const isActive = node.dataset.groupId === activeId;
    node.classList.toggle("is-active", isActive);
  });
}

function openStateOverlay(stateId, stateName) {
  if (!stateOverlay) return;
  stateOverlay.setAttribute("aria-hidden", "false");
  if (stateTitle) {
    stateTitle.textContent = stateName || stateId || "STATE";
  }
}

function closeStateOverlay() {
  if (!stateOverlay) return;
  stateOverlay.setAttribute("aria-hidden", "true");
  if (window.appState) {
    window.appState.zoomedState = null;
    window.appState.view = "map";
  }
}

groupList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.dataset.groupId) return;
  setActiveGroup(target.dataset.groupId);
});

stateBack?.addEventListener("click", () => {
  closeStateOverlay();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeStateOverlay();
});

document.addEventListener("dashboard:data-ready", () => {
  renderGroups();
  updateGroupActiveState();
});

document.addEventListener("dashboard:selection", () => {
  updateGroupActiveState();
});

document.addEventListener("dashboard:zoom", (event) => {
  const detail = event.detail || {};
  openStateOverlay(detail.stateId, detail.stateName);
});
