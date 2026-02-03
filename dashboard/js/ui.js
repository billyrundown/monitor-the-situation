const settingsPanel = document.getElementById("settings-panel");
const groupsPanel = document.getElementById("groups-panel");
const appShell = document.getElementById("app");

function syncPanelClass(panel, className) {
  if (!panel || !appShell) return;
  const isHidden = panel.getAttribute("aria-hidden") === "true";
  appShell.classList.toggle(className, !isHidden);
}

function togglePanel(panel, className) {
  if (!panel) return;
  const isHidden = panel.getAttribute("aria-hidden") === "true";
  panel.setAttribute("aria-hidden", isHidden ? "false" : "true");
  syncPanelClass(panel, className);
}

document.getElementById("toggle-settings")?.addEventListener("click", () => {
  togglePanel(settingsPanel, "has-settings");
});

document.getElementById("toggle-groups")?.addEventListener("click", () => {
  togglePanel(groupsPanel, "has-groups");
});

syncPanelClass(settingsPanel, "has-settings");
syncPanelClass(groupsPanel, "has-groups");
