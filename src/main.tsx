import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import { registerServiceWorker } from "./lib/pwa";

// Initialize error tracking and analytics
initSentry();
initAnalytics();

// Register service worker for PWA
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
