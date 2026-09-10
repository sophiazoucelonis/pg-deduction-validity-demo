import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadRuntimeConfig } from "./lib/runtime-config";

// Decide the data source (local vs blob) BEFORE first render, so every
// component can read the runtime config synchronously. The #pe-boot-loader
// stays visible across this (tiny, same-origin) fetch — no flash. The fetch
// never rejects (it falls back by hostname), so render always proceeds.
loadRuntimeConfig().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

// Remove the boot-loader overlay once React has hydrated. Minimum 800ms
// total visibility so the animation reads as intentional rather than a
// flash on a fast page load. The route-transition loader takes over for
// in-app navigations.
const BOOT_LOADER_MIN_MS = 800;
const bootStart = performance.now();
const removeBootLoader = () => {
  const el = document.getElementById("pe-boot-loader");
  if (!el) return;
  el.style.transition = "opacity 0.25s ease";
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 250);
};
requestAnimationFrame(() => {
  const elapsed = performance.now() - bootStart;
  const remaining = Math.max(0, BOOT_LOADER_MIN_MS - elapsed);
  setTimeout(removeBootLoader, remaining);
});
