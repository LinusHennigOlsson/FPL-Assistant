// Ensure app works under GitHub Pages subfolder (/FPL-Assistant/)
export function normalizeBasePath() {
  const base = import.meta.env.BASE_URL ?? "/";
  const current = window.location.pathname;

  // If the current path starts with the base, remove it logically
  if (base !== "/" && current.startsWith(base)) {
    const newPath = current.slice(base.length - 1) || "/";

    // Only adjust history, don't reload the page
    window.history.replaceState({}, "", newPath);
  }
}
