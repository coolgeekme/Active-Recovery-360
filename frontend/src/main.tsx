import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAffiliateTracking } from "@/lib/affiliate-tracking";

// Capture affiliate referrals before React mounts, so a landing click is
// recorded even if the visitor bounces off the first route.
initAffiliateTracking();

createRoot(document.getElementById("root")!).render(<App />);
