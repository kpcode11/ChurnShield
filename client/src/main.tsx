import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./index.css";

(function initTheme() {
  const stored = localStorage.getItem("churnshield-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = stored === "dark" || (stored !== "light" && prefersDark) ? "dark" : "light";
  document.documentElement.classList.add(resolved);
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
