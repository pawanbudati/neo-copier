import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept all API requests to support separate backend server deployments
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
if (API_BASE_URL) {
  const originalFetch = window.fetch;
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(`${API_BASE_URL}${input}`, init);
    }
    return originalFetch(input, init);
  };

  const OriginalEventSource = window.EventSource;
  window.EventSource = class extends OriginalEventSource {
    constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      const targetUrl = typeof url === "string" && url.startsWith("/api/")
        ? `${API_BASE_URL}${url}`
        : url;
      super(targetUrl, eventSourceInitDict);
    }
  } as any;
  
  console.log(`[Neo-Copier] Decoupled frontend mode. API requests routed to: ${API_BASE_URL}`);
}

createRoot(document.getElementById('root')!).render(
  <App />
);
