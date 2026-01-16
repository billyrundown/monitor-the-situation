const settingsPanel = document.getElementById("settings-panel");
const groupsPanel = document.getElementById("groups-panel");

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
