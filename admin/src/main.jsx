import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { registerSW } from 'virtual:pwa-register'
import './styles/tokens.css'
import './styles/Button.css'
import './styles/StaffPortal.css'
import App from './App.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)

// Registers the offline app-shell service worker (admin app only). Deferred
// until after first render so it never competes with initial paint.
registerSW({ immediate: false })

